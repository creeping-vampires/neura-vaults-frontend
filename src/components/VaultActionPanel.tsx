import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import { usePublicClient } from "wagmi";
import { Address, formatUnits, parseAbiItem, parseUnits, parseAbi } from "viem";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { getSupplyCapsForVault } from "@/services/supplyCaps";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useMultiVault } from "@/hooks/useMultiVault";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useLocation } from "react-router-dom";

// User-initiated tx: pending -> submitted -> (confirmed) or failed
// Backend-initiated tx: settling -> settled
type TxStatus =
  | "idle"
  | "pending"
  | "submitted"
  | "failed"
  | "settling"
  | "settled"
  | "canceled";
type TxType = "deposit" | "withdraw" | string;
type TxOrigin = "user" | "backend";

export interface PendingTransaction {
  id: string;
  type: TxType;
  amount: string;
  hash?: string;
  status: TxStatus;
  timestamp?: number;
  origin?: TxOrigin;
  requestId?: bigint;
  controller?: Address;
}

interface VaultActionPanelProps {
  currentVault: string;
  availableAssetBalance?: number;
  availableUserDeposits?: number;
  deposit: (amount: string) => Promise<string>;
  withdraw: (amount: string) => Promise<string>;
  isDepositTransacting: boolean;
  isWithdrawTransacting: boolean;
  vaultId?: string;
  refreshData: () => void | Promise<void>;
  isConnected: boolean;
  hasAccess: boolean;
  txCanceled: boolean;
  onRequireAccess: () => void;
  pendingDepositAssets: bigint;
  pendingRedeemShares: bigint;
  claimableDepositAssets?: number;
  claimableWithdrawAssets?: number;
}

const VaultActionPanel: React.FC<VaultActionPanelProps> = ({
  currentVault,
  availableAssetBalance,
  availableUserDeposits,
  deposit,
  withdraw,
  isDepositTransacting,
  isWithdrawTransacting,
  vaultId,
  refreshData,
  isConnected,
  hasAccess,
  txCanceled,
  onRequireAccess,
  pendingDepositAssets,
  pendingRedeemShares,
  claimableDepositAssets,
  claimableWithdrawAssets,
}) => {
  const publicClient = usePublicClient();
  const { userAddress } = useActiveWallet();
  const {
    depositEventStatus,
    setDepositEventStatus,
    withdrawEventStatus,
    setWithdrawEventStatus,
  } = useMultiVault();

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [inputAmount, setInputAmount] = useState<string>("");

  const [latestTransactions, setLatestTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [transactionMonitors, setTransactionMonitors] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());

  // Deposit validation state (caps + request-state)
  const [isValidatingDeposit, setIsValidatingDeposit] = useState(false);
  const [depositEligibility, setDepositEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    userHeadroom?: string; // human units
    vaultHeadroom?: string; // human units
  }>({ eligible: true });

  // Refs to avoid stale values inside backend monitoring interval
  const pendingDepositAssetsRef = useRef<bigint>(pendingDepositAssets ?? 0n);
  const pendingRedeemSharesRef = useRef<bigint>(pendingRedeemShares ?? 0n);

  useEffect(() => {
    pendingDepositAssetsRef.current = pendingDepositAssets ?? 0n;
  }, [pendingDepositAssets]);

  useEffect(() => {
    pendingRedeemSharesRef.current = pendingRedeemShares ?? 0n;
  }, [pendingRedeemShares]);

  // Create a transaction entry in the local panel history
  const addPendingTransaction = useCallback(
    (
      type: "deposit" | "withdraw",
      amount: string,
      hash?: string,
      origin: TxOrigin = "user",
      requestId?: bigint,
      controller?: Address
    ) => {
      const id = `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newTransaction: PendingTransaction = {
        id,
        type,
        amount,
        hash,
        status: origin === "backend" ? "settling" : "pending",
        timestamp: Date.now(),
        origin,
        requestId,
        controller,
      };

      setLatestTransactions((prev) => [...prev, newTransaction]);

      if (hash) {
        startTransactionMonitoring(id, hash);
      }

      return id;
    },
    []
  );

  // Evaluate deposit guard
  const evaluateDepositGuard = useCallback(async (): Promise<{
    eligible: boolean;
    reason?: string;
    userHeadroom?: string;
    vaultHeadroom?: string;
  }> => {
    if (!publicClient || !vaultId || !userAddress || !inputAmount) {
      const res = {
        eligible: false,
        reason: "Connect wallet and enter amount.",
      };
      setDepositEligibility(res);
      return res;
    }
    try {
      setIsValidatingDeposit(true);

      // Read vault asset and decimals
      const assetAddress = (await publicClient.readContract({
        address: vaultId as `0x${string}`,
        abi: YieldAllocatorVaultABI,
        functionName: "asset",
      })) as `0x${string}`;
      const assetDecimals = (await publicClient.readContract({
        address: assetAddress,
        abi: parseAbi(["function decimals() view returns (uint8)"]),
        functionName: "decimals",
      })) as number;

      const { perUserCapUnits, vaultCapUnits } = getSupplyCapsForVault(
        Number(assetDecimals)
      );
      const requestedAssets = parseUnits(inputAmount, Number(assetDecimals));

      // Live state reads
      const [vaultSupplied, userShares] = await Promise.all([
        publicClient.readContract({
          address: vaultId as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "totalAssets",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: vaultId as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
        }) as Promise<bigint>,
      ]);
      const userSupplied = (await publicClient.readContract({
        address: vaultId as `0x${string}`,
        abi: YieldAllocatorVaultABI,
        functionName: "convertToAssets",
        args: [userShares],
      })) as bigint;

      const userClaimableAssets = (await publicClient.readContract({
        address: vaultId as `0x${string}`,
        abi: YieldAllocatorVaultABI,
        functionName: "claimableDepositRequest",
        args: [0n, userAddress as `0x${string}`],
      })) as bigint;

      // Request-state guard
      if ((pendingDepositAssets ?? 0n) > 0n) {
        const res = {
          eligible: false,
          reason:
            "A deposit request is already pending—settle or cancel first.",
        };
        setDepositEligibility(res);
        return res;
      }

      if ((userClaimableAssets ?? 0n) > 0n) {
        const res = {
          eligible: false,
          reason:
            "You have a claimable deposit—wait for agent to claim shares or claim.",
        };
        setDepositEligibility(res);
        return res;
      }

      // Caps guard
      const userEffective = (userSupplied ?? 0n) + (pendingDepositAssets ?? 0n);
      const userHeadroomUnits =
        perUserCapUnits > userEffective ? perUserCapUnits - userEffective : 0n;
      const vaultHeadroomUnits =
        vaultCapUnits > (vaultSupplied ?? 0n)
          ? vaultCapUnits - (vaultSupplied ?? 0n)
          : 0n;

      if (requestedAssets > userHeadroomUnits) {
        const res = {
          eligible: false,
          reason: "Requested amount exceeds per-user cap headroom.",
          userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
          vaultHeadroom: formatUnits(vaultHeadroomUnits, Number(assetDecimals)),
        };
        setDepositEligibility(res);
        return res;
      }

      if (requestedAssets > vaultHeadroomUnits) {
        const res = {
          eligible: false,
          reason: "Requested amount exceeds vault cap headroom.",
          userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
          vaultHeadroom: formatUnits(vaultHeadroomUnits, Number(assetDecimals)),
        };
        setDepositEligibility(res);
        return res;
      }

      const res = {
        eligible: true,
        userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
        vaultHeadroom: formatUnits(vaultHeadroomUnits, Number(assetDecimals)),
      };
      setDepositEligibility(res);
      return res;
    } catch (e) {
      console.warn("Deposit guard evaluation failed:", e);
      const res = {
        eligible: false,
        reason: "Unable to validate deposit right now.",
      };
      setDepositEligibility(res);
      return res;
    } finally {
      setIsValidatingDeposit(false);
    }
  }, [publicClient, vaultId, userAddress, inputAmount]);

useEffect(() => {
  evaluateDepositGuard();
}, [evaluateDepositGuard]);

  const updateTransactionStatus = useCallback(
    (id: string, nextStatus: TxStatus, hash?: string) => {
      // Status order for validation and progression gating
      const STATUS_ORDER: Record<TxStatus, number> = {
        idle: 0,
        pending: 1,
        submitted: 2,
        settling: 3,
        settled: 4,
        canceled: 5,
        failed: 6,
      };

      const isTerminal = (s: TxStatus) =>
        s === "failed" || s === "settled" || s === "canceled";
      const isProgression = (from: TxStatus, to: TxStatus) => {
        if (from === to) return true;
        if (to === "failed" && from !== "settled") return true;
        if (to === "canceled" && from !== "settled") return true;
        return (STATUS_ORDER[to] ?? 0) > (STATUS_ORDER[from] ?? 0);
      };

      let changedTx: PendingTransaction | undefined;
      let previousStatus: TxStatus | undefined;
      let becameTerminal = false;

      setLatestTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== id) return tx;

          previousStatus = tx.status as TxStatus;

          if (!isProgression(previousStatus, nextStatus)) {
            console.warn("Ignored invalid status transition", {
              id,
              type: tx.type,
              from: previousStatus,
              to: nextStatus,
            });
            return tx; // no change
          }

          const updatedTx = {
            ...tx,
            status: nextStatus,
            ...(hash && { hash }),
          };
          changedTx = updatedTx;
          becameTerminal = isTerminal(nextStatus);

          return updatedTx;
        })
      );

      // Propagate to UI/logging/external systems after state set
      try {
        // Clear any active monitor on terminal states outside the state updater to avoid side-effects
        if (becameTerminal) {
          const monitor = transactionMonitors.get(id);
          if (monitor) {
            clearInterval(monitor);
            setTransactionMonitors((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
          }
        }

        if (changedTx) {
          // Gate multi-vault status propagation to avoid regressions
          const gateProgress = (
            current: string | undefined,
            next: TxStatus
          ) => {
            const currentRank =
              STATUS_ORDER[(current as TxStatus) || "idle"] ?? 0;
            const nextRank = STATUS_ORDER[next];
            return nextRank >= currentRank;
          };

          // Update global event status where applicable
          if (changedTx.type === "deposit") {
            if (gateProgress(depositEventStatus, nextStatus)) {
              setDepositEventStatus(nextStatus);
            }
          } else if (changedTx.type === "withdraw") {
            if (gateProgress(withdrawEventStatus, nextStatus)) {
              setWithdrawEventStatus(nextStatus);
            }
          }

          // Structured console logging for observability
          const logPayload = {
            id: changedTx.id,
            type: changedTx.type,
            origin: changedTx.origin,
            amount: changedTx.amount,
            status: nextStatus,
            prevStatus: previousStatus,
            hash: changedTx.hash,
            requestId: changedTx.requestId?.toString(),
            controller: changedTx.controller,
            vaultId,
            userAddress,
            timestamp: Date.now(),
          };

          console.info("[VaultActionPanel] Tx status change", logPayload);

          // UX feedback
          if (nextStatus === "failed") {
            toast({
              title: "Transaction failed",
              description: `Your ${changedTx.type} of ${changedTx.amount} ${currentVault} failed.`,
              variant: "destructive",
            });
          } else if (nextStatus === "settled") {
            toast({
              title: "Settlement complete",
              description: `Your ${changedTx.type} request has settled on-chain.`,
            });
          }
        }
      } catch (err) {
        console.error("Propagation after status change failed", err);
      }
    },
    [
      transactionMonitors,
      setTransactionMonitors,
      depositEventStatus,
      withdrawEventStatus,
      setDepositEventStatus,
      setWithdrawEventStatus,
      vaultId,
      userAddress,
      currentVault,
      toast,
    ]
  );

  // Update backend settling transaction with parsed request information
  const updateBackendRequestInfo = useCallback(
    (id: string, requestId: bigint, controller: Address) => {
      setLatestTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, requestId, controller } : tx))
      );
    },
    []
  );

  // Fallback: when global event status reaches settled, force-settle local txs
  const prevDepositEventStatusRef = useRef<string | undefined>(
    depositEventStatus
  );
  const prevWithdrawEventStatusRef = useRef<string | undefined>(
    withdrawEventStatus
  );

  useEffect(() => {
    const prev = prevDepositEventStatusRef.current;
    if (depositEventStatus === "settled" && prev !== "settled") {
      // Settle all backend-origin deposit transactions still not terminal
      latestTransactions.forEach((tx) => {
        if (
          tx.type === "deposit" &&
          tx.origin === "backend" &&
          tx.status !== "settled" &&
          tx.status !== "failed"
        ) {
          updateTransactionStatus(tx.id, "settled");
        }
      });
    }
    prevDepositEventStatusRef.current = depositEventStatus;
  }, [depositEventStatus, latestTransactions, updateTransactionStatus]);

  useEffect(() => {
    const prev = prevWithdrawEventStatusRef.current;
    if (withdrawEventStatus === "settled" && prev !== "settled") {
      // Settle all backend-origin withdraw transactions still not terminal
      latestTransactions.forEach((tx) => {
        if (
          tx.type === "withdraw" &&
          tx.origin === "backend" &&
          tx.status !== "settled" &&
          tx.status !== "failed"
        ) {
          updateTransactionStatus(tx.id, "settled");
        }
      });
    }
    prevWithdrawEventStatusRef.current = withdrawEventStatus;
  }, [withdrawEventStatus, latestTransactions, updateTransactionStatus]);

  // Monitor the initial user-initiated tx until the receipt is available, then start backend tracking
  const startTransactionMonitoring = useCallback(
    (
      id: string,
      hash: string,
      actionType?: "deposit" | "withdraw",
      amount?: string,
      backendId?: string
    ) => {
      (async () => {
        if (!publicClient) return;
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
            confirmations: 1,
          });

          const status: TxStatus =
            receipt.status === "success" ? "submitted" : "failed";

          updateTransactionStatus(id, status, hash);

          if (status === "submitted") {
            setLatestTransactions((currentTransactions) =>
              currentTransactions.map((tx) =>
                tx.id === id ? { ...tx, status } : tx
              )
            );

            // Attempt to parse request info and start backend monitoring
            try {
              if (!vaultId) throw new Error("Missing vaultId");
              const blockNumberBigInt = receipt.blockNumber as bigint;

              if (actionType === "deposit") {
                const depositRequestEvent = parseAbiItem(
                  "event DepositRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 assets)"
                );
                const depositLogs = await publicClient.getLogs({
                  address: vaultId as `0x${string}`,
                  event: depositRequestEvent,
                  args: { owner: userAddress as `0x${string}` },
                  fromBlock: blockNumberBigInt,
                  toBlock: blockNumberBigInt,
                });

                if (depositLogs && depositLogs.length > 0) {
                  const latest = depositLogs[depositLogs.length - 1];
                  const requestId = latest.args.requestId as bigint;
                  const controller = latest.args.controller as `0x${string}`;

                  if (backendId) {
                    updateBackendRequestInfo(backendId, requestId, controller);
                    startBackendMonitoring(
                      backendId,
                      "deposit",
                      requestId,
                      controller
                    );
                  } else if (userAddress) {
                    const newBackendId = addPendingTransaction(
                      "deposit",
                      amount || "",
                      undefined,
                      "backend",
                      requestId,
                      controller
                    );
                    startBackendMonitoring(
                      newBackendId,
                      "deposit",
                      requestId,
                      controller
                    );
                  }
                } else if (userAddress) {
                  if (backendId) {
                    updateBackendRequestInfo(
                      backendId,
                      0n,
                      userAddress as Address
                    );
                    startBackendMonitoring(
                      backendId,
                      "deposit",
                      0n,
                      userAddress as Address
                    );
                  } else {
                    const newBackendId = addPendingTransaction(
                      "deposit",
                      amount || "",
                      undefined,
                      "backend",
                      0n,
                      userAddress as Address
                    );
                    startBackendMonitoring(
                      newBackendId,
                      "deposit",
                      0n,
                      userAddress as Address
                    );
                  }
                }
              } else if (actionType === "withdraw") {
                const redeemRequestEvent = parseAbiItem(
                  "event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares)"
                );
                const redeemLogs = await publicClient.getLogs({
                  address: vaultId as `0x${string}`,
                  event: redeemRequestEvent,
                  args: { owner: userAddress as `0x${string}` },
                  fromBlock: blockNumberBigInt,
                  toBlock: blockNumberBigInt,
                });

                if (redeemLogs && redeemLogs.length > 0) {
                  const latest = redeemLogs[redeemLogs.length - 1];
                  const requestId = latest.args.requestId as bigint;
                  const controller = latest.args.controller as `0x${string}`;

                  if (backendId) {
                    updateBackendRequestInfo(backendId, requestId, controller);
                    startBackendMonitoring(
                      backendId,
                      "withdraw",
                      requestId,
                      controller
                    );
                  } else if (userAddress) {
                    const newBackendId = addPendingTransaction(
                      "withdraw",
                      amount || "",
                      undefined,
                      "backend",
                      requestId,
                      controller
                    );
                    startBackendMonitoring(
                      newBackendId,
                      "withdraw",
                      requestId,
                      controller
                    );
                  }
                } else if (userAddress) {
                  if (backendId) {
                    updateBackendRequestInfo(
                      backendId,
                      0n,
                      userAddress as Address
                    );
                    startBackendMonitoring(
                      backendId,
                      "withdraw",
                      0n,
                      userAddress as Address
                    );
                  } else {
                    const newBackendId = addPendingTransaction(
                      "withdraw",
                      amount || "",
                      undefined,
                      "backend",
                      0n,
                      userAddress as Address
                    );
                    startBackendMonitoring(
                      newBackendId,
                      "withdraw",
                      0n,
                      userAddress as Address
                    );
                  }
                }
              }
            } catch (e) {
              console.warn("Backend tracking initialization failed:", e);
            }
          }
        } catch (error) {
          console.error("Error monitoring transaction:", error);
          // Mark failed if receipt wait errored out (timeout or revert edge)
          updateTransactionStatus(id, "failed", hash);
        }
      })();
    },
    [
      updateTransactionStatus,
      refreshData,
      currentVault,
      publicClient,
      vaultId,
      userAddress,
      addPendingTransaction,
      updateBackendRequestInfo,
    ]
  );

  // Monitor backend-initiated request until settled
  const startBackendMonitoring = useCallback(
    (
      id: string,
      type: "deposit" | "withdraw",
      requestId: bigint,
      controller: Address
    ) => {
      if (!publicClient || !vaultId) return;
      // Avoid starting duplicate monitors for the same transaction id
      if (transactionMonitors.has(id)) return;

      const monitor = setInterval(async () => {
        try {
          if (type === "deposit") {
            if (pendingDepositAssetsRef.current > 0n) {
              updateTransactionStatus(id, "settling");
            } else {
              updateTransactionStatus(id, "settled");
              clearInterval(monitor);
              setTransactionMonitors((prev) => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
              });
            }
          } else {
            if (pendingRedeemSharesRef.current > 0n) {
              console.debug("[BackendMonitor] Withdraw still settling", {
                id,
                pendingRedeemShares: pendingRedeemSharesRef.current.toString(),
              });
              updateTransactionStatus(id, "settling");
            } else {
              console.debug("[BackendMonitor] Withdraw settled", {
                id,
                pendingRedeemShares: pendingRedeemSharesRef.current.toString(),
              });
              updateTransactionStatus(id, "settled");
              clearInterval(monitor);
              setTransactionMonitors((prev) => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
              });
            }
          }
        } catch (e) {
          // Keep settling state; retry will continue
          console.warn("Backend monitoring read failed:", e);
        }
      }, 5000);

      setTransactionMonitors((prev) => new Map(prev.set(id, monitor)));
    },
    [publicClient, vaultId, updateTransactionStatus, transactionMonitors]
  );

  useEffect(() => {
    return () => {
      transactionMonitors.forEach((monitor) => {
        clearInterval(monitor);
      });
    };
  }, [transactionMonitors]);

  // Persist queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "VAULT_TX_QUEUE",
        JSON.stringify(latestTransactions)
      );
    } catch {}
  }, [latestTransactions]);

  // Hydrate queue and restart monitors for backend settling items
  useEffect(() => {
    try {
      const raw = localStorage.getItem("VAULT_TX_QUEUE");
      if (raw) {
        const parsed: PendingTransaction[] = JSON.parse(raw);
        setLatestTransactions(parsed);
        parsed.forEach((tx) => {
          if (
            tx.origin === "backend" &&
            tx.status === "settling" &&
            (tx.type === "deposit" || tx.type === "withdraw")
          ) {
            startBackendMonitoring(
              tx.id,
              tx.type as "deposit" | "withdraw",
              tx.requestId ?? 0n,
              (tx.controller as Address) || (userAddress as Address)
            );
          }
        });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // check pending transaction on page refresh
  useEffect(() => {
    const addDepositPendingTransactions = () => {
      if (
        (pendingDepositAssets ?? 0n) > 0n ||
        (claimableDepositAssets ?? 0) > 0
      ) {
        const existingDepositTx = latestTransactions.find(
          (tx) => tx.type === "deposit" && tx.origin === "backend"
        );

        if (!existingDepositTx) {
          const depositTx: PendingTransaction = {
            id: `backend-deposit-${Date.now()}`,
            type: "deposit",
            amount: formatUnits(pendingDepositAssets, 6),
            status: "settling",
            origin: "backend",
            timestamp: Date.now(),
          };
          setLatestTransactions((prev) => [...prev, depositTx]);
          if (userAddress) {
            startBackendMonitoring(
              depositTx.id,
              "deposit",
              0n,
              userAddress as Address
            );
          }
        }
      }
    };

    addDepositPendingTransactions();
  }, [pendingDepositAssets, claimableDepositAssets]);

  useEffect(() => {
    const addWithdrawPendingTransactions = () => {
      if (
        (pendingRedeemShares ?? 0n) > 0n ||
        (claimableWithdrawAssets ?? 0) > 0
      ) {
        const existingWithdrawTx = latestTransactions.find(
          (tx) => tx.type === "withdraw" && tx.origin === "backend"
        );

        if (!existingWithdrawTx) {
          const withdrawTx: PendingTransaction = {
            id: `backend-withdraw-${Date.now()}`,
            type: "withdraw",
            amount: formatUnits(pendingRedeemShares, 18),
            status: "settling",
            origin: "backend",
            timestamp: Date.now(),
          };
          setLatestTransactions((prev) => [...prev, withdrawTx]);
          if (userAddress) {
            startBackendMonitoring(
              withdrawTx.id,
              "withdraw",
              0n,
              userAddress as Address
            );
          }
        }
      }
    };

    addWithdrawPendingTransactions();
  }, [pendingRedeemShares, claimableWithdrawAssets]);

  // Remove backend-origin transactions when pending values return to 0
  useEffect(() => {
    const removeBackendPendingTransactions = () => {
      if (
        (pendingDepositAssets ?? 0n) === 0n &&
        claimableDepositAssets === 0 &&
        (pendingRedeemShares ?? 0n) === 0n &&
        claimableWithdrawAssets === 0
      ) {
        setTimeout(() => {
          setLatestTransactions((prev) =>
            prev.filter((tx) => tx.origin !== "backend")
          );
        }, 15 * 60 * 1000);
      }
    };

    removeBackendPendingTransactions();
  }, [
    pendingDepositAssets,
    claimableDepositAssets,
    pendingRedeemShares,
    claimableWithdrawAssets,
  ]);

  // Monitor txCanceled to update local UI state only
  const prevTxCanceledRef = useRef<boolean>(txCanceled);
  useEffect(() => {
    const prev = prevTxCanceledRef.current;
    if (txCanceled && !prev) {
      // Mark all backend-origin deposit transactions as canceled if not terminal
      const targets = latestTransactions.filter(
        (tx) =>
          tx.type === "deposit" &&
          tx.origin === "backend" &&
          tx.status !== "settled" &&
          tx.status !== "failed" &&
          tx.status !== "canceled"
      );

      targets.forEach((tx) => updateTransactionStatus(tx.id, "canceled"));
    }
    prevTxCanceledRef.current = txCanceled;
  }, [txCanceled, latestTransactions, updateTransactionStatus]);

  const handleDeposit = async (amount: string) => {
    let depositId: string | null = null;

    try {
      depositId = addPendingTransaction("deposit", amount);

      const depositTx = await deposit(amount);

      if (depositId) {
        updateTransactionStatus(depositId, "submitted", depositTx);
        // Immediately enqueue backend entry with settling state
        let backendId: string | undefined;
        if (userAddress) {
          backendId = addPendingTransaction(
            "deposit",
            amount || "",
            undefined,
            "backend",
            0n,
            userAddress as Address
          );
          startBackendMonitoring(
            backendId,
            "deposit",
            0n,
            userAddress as Address
          );
        }
        startTransactionMonitoring(
          depositId,
          depositTx,
          "deposit",
          amount,
          backendId
        );
      }
    } catch (e: any) {
      if (depositId) {
        updateTransactionStatus(depositId, "failed");
      }
    }
  };

  const handleWithdraw = async (amount: string) => {
    let withdrawId: string | null = null;

    try {
      withdrawId = addPendingTransaction("withdraw", amount);

      const withdrawTx = await withdraw(amount);

      if (withdrawId) {
        updateTransactionStatus(withdrawId, "submitted", withdrawTx);
        // Immediately enqueue backend entry with settling state
        let backendId: string | undefined;
        if (userAddress) {
          backendId = addPendingTransaction(
            "withdraw",
            amount || "",
            undefined,
            "backend",
            0n,
            userAddress as Address
          );
          startBackendMonitoring(
            backendId,
            "withdraw",
            0n,
            userAddress as Address
          );
        }
        startTransactionMonitoring(
          withdrawId,
          withdrawTx,
          "withdraw",
          amount,
          backendId
        );
      }
    } catch (e: any) {
      if (withdrawId) {
        updateTransactionStatus(withdrawId, "failed");
      }
    }
  };

  const handlePercentageClick = async (percent: number) => {
    const maxAmount =
      activeTab === "deposit"
        ? availableAssetBalance || 0
        : availableUserDeposits || 0;
    const amount = ((maxAmount * percent) / 100).toString();
    setInputAmount(amount);
    await evaluateDepositGuard();
  };

  const { connectWithFallback } = useWalletConnection();
  const location = useLocation();

  const handleAction = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;

    try {
      if (activeTab === "deposit") {
        if (!isConnected) {
          await connectWithFallback(location.pathname);
          return;
        } else if (!hasAccess) {
          onRequireAccess();
          return;
        } else {
          const result = await evaluateDepositGuard();
          if (!result.eligible) {
            toast({
              variant: "destructive",
              title: "Deposit Blocked",
              description:
                depositEligibility.reason ||
                "Deposit validation failed. Please check supply caps and pending requests.",
            });
            return;
          }
          await handleDeposit(inputAmount);
        }
      } else {
        if (!isConnected) {
          await connectWithFallback(location.pathname);
          return;
        }
        await handleWithdraw(inputAmount);
      }
      setInputAmount("");
    } catch (e: any) {}
  };

  return (
    <Card
      className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl sm:min-h-[435px]"
      style={{ height: "calc(100vh - 315px)" }}
    >
      <CardContent className="p-4 pt-2">
        <div className="flex mb-4 border-b border-border">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 py-3 px-4 text-base font-medium transition-all duration-200 relative ${
              activeTab === "deposit"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Deposit
            {activeTab === "deposit" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-4 text-base font-medium transition-all duration-200 relative ${
              activeTab === "withdraw"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Withdraw
            {activeTab === "withdraw" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        <div className="mt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-sm">Available</span>
            <span className="text-foreground font-medium">
              {activeTab === "deposit"
                ? `${(availableAssetBalance ?? 0).toFixed(2)} ${currentVault}`
                : `${(availableUserDeposits ?? 0).toFixed(2)} ${currentVault}`}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentageClick(percent)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        <div className="">
          <div className="relative">
            <Input
              type="number"
              min="0"
              value={inputAmount}
              onChange={async (e) => {
                const value = e.target.value;
                if (value === "" || Number(value) >= 0) {
                  setInputAmount(value);
                  await evaluateDepositGuard();
                }
              }}
              placeholder="Enter amount"
              className="w-full h-12 px-4 py-3 bg-gradient-to-br from-card to-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground text-sm">
              {currentVault}
            </span>
          </div>
        </div>

        <Button
          onClick={handleAction}
          disabled={
            activeTab === "deposit"
              ? isDepositTransacting ||
                !inputAmount ||
                parseFloat(inputAmount) <= 0 ||
                (availableAssetBalance ?? 0) <= 0 ||
                isValidatingDeposit 
                // || depositEligibility.eligible
              : isWithdrawTransacting ||
                !inputAmount ||
                parseFloat(inputAmount) <= 0 ||
                (availableUserDeposits ?? 0) <= 0
          }
          className="w-full mt-4"
          variant="wallet"
        >
          {activeTab === "deposit"
            ? isDepositTransacting
              ? "Depositing..."
              : isValidatingDeposit
              ? "Validating..."
              : "Deposit"
            : activeTab === "withdraw" &&
              (isWithdrawTransacting ? "Withdrawing..." : "Withdraw")}
        </Button>

        {activeTab === "deposit" && (
          <div className="mt-2 text-xs text-muted-foreground">
            {depositEligibility.reason ? (
              <div>
                {depositEligibility.userHeadroom !== undefined &&
                  depositEligibility.vaultHeadroom !== undefined && (
                    <div className="mt-1">
                      <div>
                        Personal deposit limit left:{" "}
                        {depositEligibility.userHeadroom} {currentVault}
                      </div>
                      <div>
                        Space left in vault: {depositEligibility.vaultHeadroom}{" "}
                        {currentVault}
                      </div>
                    </div>
                  )}
              </div>
            ) : depositEligibility.userHeadroom !== undefined &&
              depositEligibility.vaultHeadroom !== undefined ? (
              <div>
                <div>
                  You can still deposit up to {depositEligibility.userHeadroom}{" "}
                  {currentVault}
                </div>
                <div>
                  Space left in vault: {depositEligibility.vaultHeadroom}{" "}
                  {currentVault}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {latestTransactions.length > 0 && (
          <div className="mt-2 space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Latest Transactions
            </h4>
            <div
              className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
              style={{ height: "calc(100vh - 635px)" }}
            >
              {latestTransactions
                .filter((tx) => tx.type === "deposit" || tx.type === "withdraw")
                .map((tx) => {
                  const getTransactionIcon = () => {
                    if (tx.status === "submitted")
                      return <CheckCircle className="h-4 w-4 text-primary" />;
                    if (tx.status === "settled")
                      return <CheckCircle className="h-4 w-4 text-primary" />;
                    if (tx.status === "failed")
                      return <XCircle className="h-4 w-4 text-red-500" />;
                    if (tx.status === "canceled")
                      return <XCircle className="h-4 w-4 text-red-500" />;
                    return (
                      <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
                    );
                  };

                  const getStatusText = () => {
                    if (tx.status === "submitted")
                      return "Transaction submitted";
                    if (tx.status === "settling") return "Awaiting settlement";
                    if (tx.status === "settled") return "Transaction settled";
                    if (tx.status === "failed") return "Failed";
                    if (tx.status === "canceled") return "Transaction canceled";
                    return "Awaiting confirmation";
                  };

                  const getStatusColor = () => {
                    if (tx.status === "submitted") return "text-primary";
                    if (tx.status === "settling") return "text-orange-400";
                    if (tx.status === "settled") return "text-primary";
                    if (tx.status === "failed") return "text-red-500";
                    if (tx.status === "canceled") return "text-red-500";
                    return "text-orange-400";
                  };

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 py-1 bg-card/50 rounded-md border border-border/50"
                    >
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon()}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground capitalize">
                            {tx.type}{" "}
                            {tx.amount &&
                              `${parseFloat(tx.amount).toFixed(
                                4
                              )} ${currentVault}`}
                          </span>
                          <span className={`text-xs ${getStatusColor()}`}>
                            {getStatusText()}
                          </span>
                        </div>
                      </div>
                      {tx.hash && (
                        <a
                          href={getExplorerTxUrl(tx.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VaultActionPanel;
