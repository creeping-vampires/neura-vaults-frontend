import React, { useEffect, useMemo, useState } from "react";
import { Address, formatUnits, parseAbi, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { getSupplyCapsForVault, RAW_CAPS } from "@/services/supplyCaps";
import { formatCurrency } from "@/utils/currency";

interface EligibilityState {
  eligible: boolean;
  reason?: string;
  userHeadroom?: string; 
  vaultHeadroom?: string; 
}

interface SupplyCapHeadroomProps {
  vaultId?: string; 
  assetSymbol: string;
  inputAmount?: string;
  pendingDepositAssets?: bigint;
  claimableDepositAssets?: number;
  claimableWithdrawAssets?: number;
  className?: string;
  onComputed?: (eligibility: EligibilityState) => void;
}

const SupplyCapHeadroom: React.FC<SupplyCapHeadroomProps> = ({
  vaultId,
  assetSymbol,
  inputAmount,
  pendingDepositAssets,
  claimableDepositAssets,
  claimableWithdrawAssets,
  className,
  onComputed,
}) => {
  const publicClient = usePublicClient();
  const { userAddress } = useActiveWallet();

  const [eligibility, setEligibility] = useState<EligibilityState>({
    eligible: true,
  });
  const [validating, setValidating] = useState(true);
  const [assetDecimals, setAssetDecimals] = useState<number | null>(null);

  // Fetch asset decimals once per vault
  useEffect(() => {
    let cancelled = false;
    const readDecimals = async () => {
      try {
        if (!publicClient || !vaultId) return;
        const assetAddress = (await publicClient.readContract({
          address: vaultId as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "asset",
        })) as `0x${string}`;
        const decimals = (await publicClient.readContract({
          address: assetAddress,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        })) as number;
        if (!cancelled) setAssetDecimals(Number(decimals));
      } catch (e) {
        if (!cancelled) setAssetDecimals(null);
      }
    };
    readDecimals();
    return () => {
      cancelled = true;
    };
  }, [publicClient, vaultId]);

  const status = useMemo<"info" | "warning" | "error">(() => {
    const r = (eligibility.reason || "").toLowerCase();
    if (!r) return "info";
    if (
      r.includes("exceed") ||
      r.includes("unable") ||
      r.includes("fail") ||
      r.includes("error")
    ) {
      return "error";
    }
    if (
      r.includes("pending") ||
      r.includes("claimable") ||
      r.includes("cancel")
    ) {
      return "warning";
    }
    return "info";
  }, [eligibility.reason]);

  // Calculate and update supply cap headroom
  useEffect(() => {
    let cancelled = false;
    const evaluate = async () => {
      if (!publicClient || !vaultId || !userAddress || !assetDecimals) {
        const res = {
          eligible: false,
          reason: "",
        } as EligibilityState;
        if (!cancelled) {
          setEligibility(res);
          onComputed?.(res);
        }
        return;
      }
      try {
        // Caps and requested amount
        const { perUserCapUnits, vaultCapUnits } = getSupplyCapsForVault(
          Number(assetDecimals)
        );
        const requestedAssets = inputAmount
          ? parseUnits(inputAmount, Number(assetDecimals))
          : 0n;

        // Live reads
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

        // Request-state guards
        if ((pendingDepositAssets ?? 0n) > 0n) {
          const res = {
            eligible: false,
            reason:
              "A deposit request is already pending—settle or cancel first.",
            userHeadroom: formatUnits(
              perUserCapUnits > (userSupplied ?? 0n)
                ? perUserCapUnits - (userSupplied ?? 0n)
                : 0n,
              Number(assetDecimals)
            ),
            vaultHeadroom: formatUnits(
              vaultCapUnits > (vaultSupplied ?? 0n)
                ? vaultCapUnits - (vaultSupplied ?? 0n)
                : 0n,
              Number(assetDecimals)
            ),
          } as EligibilityState;
          if (!cancelled) {
            setEligibility(res);
            onComputed?.(res);
          }
          return;
        }

        if (
          (userClaimableAssets ?? 0n) > 0n ||
          (claimableDepositAssets ?? 0) > 0
        ) {
          const res = {
            eligible: false,
            reason:
              "You have a claimable deposit—wait for agent to claim shares or claim.",
            userHeadroom: formatUnits(
              perUserCapUnits > (userSupplied ?? 0n)
                ? perUserCapUnits - (userSupplied ?? 0n)
                : 0n,
              Number(assetDecimals)
            ),
            vaultHeadroom: formatUnits(
              vaultCapUnits > (vaultSupplied ?? 0n)
                ? vaultCapUnits - (vaultSupplied ?? 0n)
                : 0n,
              Number(assetDecimals)
            ),
          } as EligibilityState;
          if (!cancelled) {
            setEligibility(res);
            onComputed?.(res);
          }
          return;
        }

        // Caps guard
        const userEffective =
          (userSupplied ?? 0n) + (pendingDepositAssets ?? 0n);
        const userHeadroomUnits =
          perUserCapUnits > userEffective
            ? perUserCapUnits - userEffective
            : 0n;
        const vaultHeadroomUnits =
          vaultCapUnits > (vaultSupplied ?? 0n)
            ? vaultCapUnits - (vaultSupplied ?? 0n)
            : 0n;

        if (requestedAssets > userHeadroomUnits) {
          const res = {
            eligible: false,
            reason: "Requested amount exceeds per-user cap headroom.",
            userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
            vaultHeadroom: formatUnits(
              vaultHeadroomUnits,
              Number(assetDecimals)
            ),
          } as EligibilityState;
          if (!cancelled) {
            setEligibility(res);
            onComputed?.(res);
          }
          return;
        }

        if (requestedAssets > vaultHeadroomUnits) {
          const res = {
            eligible: false,
            reason: "Requested amount exceeds vault cap headroom.",
            userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
            vaultHeadroom: formatUnits(
              vaultHeadroomUnits,
              Number(assetDecimals)
            ),
          } as EligibilityState;
          if (!cancelled) {
            setEligibility(res);
            onComputed?.(res);
          }
          return;
        }

        const res = {
          eligible: true,
          userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
          vaultHeadroom: formatUnits(vaultHeadroomUnits, Number(assetDecimals)),
        } as EligibilityState;
        if (!cancelled) {
          setEligibility(res);
          onComputed?.(res);
        }
      } catch (e) {
        const res = {
          eligible: false,
          reason: "Unable to validate deposit right now.",
        } as EligibilityState;
        if (!cancelled) {
          setEligibility(res);
          onComputed?.(res);
        }
      }
    };
    evaluate();
    return () => {
      cancelled = true;
    };
  }, [
    publicClient,
    vaultId,
    userAddress,
    assetDecimals,
    inputAmount,
    pendingDepositAssets,
    claimableDepositAssets,
    claimableWithdrawAssets,
    onComputed,
  ]);

  const colorClass = useMemo(() => {
    switch (status) {
      case "error":
        return "text-red-600";
      case "warning":
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  }, [status]);

  return (
    <div
      className={"mt-2 text-xs" + (className ?? "")}
      role="status"
      aria-live="polite"
    >
      {/* {eligibility.reason && (
        <div className={colorClass}>{eligibility.reason}</div>
      )} */}
      {(!validating||(eligibility.userHeadroom !== undefined &&
        eligibility.vaultHeadroom !== undefined)) ? (
          <div className="mt-3 text-muted-foreground flex gap-3 text-center w-full">
            <div className={`w-full flex flex-col items-center justify-center gap-1 p-2 py-1 border rounded-md ${status==="error"?"border-red-500":"border-border "}`}>
              <div>Your remaining quota:</div>
              <div className="text-sm text-white">
                {Number(eligibility.userHeadroom).toFixed(2)}
                <span className="text-base text-muted-foreground" style={{lineHeight:"60%"}}>{" "}/</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(RAW_CAPS.perUser, '')}
                </span>
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-1 p-2 py-1 bg-gradient-to-br from-card to-background border border-border rounded-md">
              <div>Vault Capacity:</div>
              <div className="text-sm text-white">
                {Number(eligibility.vaultHeadroom).toFixed(2)}
                <span className="text-base text-muted-foreground" style={{lineHeight:"60%"}}>{" "}/</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(RAW_CAPS.vault, '')}
                </span>
              </div>
            </div>
          </div>
        ):
        <div className="mt-3 text-muted-foreground flex gap-3 text-center w-full">
          <div className="w-full flex flex-col items-center justify-center gap-1 p-2 py-1 bg-gradient-to-br from-card to-background border border-border rounded-md animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="w-full flex flex-col items-center justify-center gap-1 p-2 py-1 bg-gradient-to-br from-card to-background border border-border rounded-md animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        </div>
        }
        {/* <div className="mt-3 text-muted-foreground flex gap-3 text-center w-full">
          <div className="w-full flex flex-col items-center justify-center gap-1 p-2 py-1 bg-gradient-to-br from-card to-background border border-border rounded-md animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="w-full flex flex-col items-center justify-center gap-1 p-2 py-1 bg-gradient-to-br from-card to-background border border-border rounded-md animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        </div> */}
    </div>
  );
};

export default React.memo(SupplyCapHeadroom);
