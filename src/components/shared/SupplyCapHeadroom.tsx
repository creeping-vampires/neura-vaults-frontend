import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseAbi, parseUnits } from "viem";
import { usePublicClient, useAccount } from "wagmi";
import { usePrice } from "@/hooks/usePrice";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { getSupplyCapsForVault, RAW_CAPS } from "@/services/supplyCaps";
import { formatCurrency } from "@/utils/currency";

interface HeadroomState {
  userHeadroom?: string;
  vaultHeadroom?: string;
}

interface SupplyCapHeadroomProps {
  show: boolean;
  vaultId?: string;
  assetAddress: string;
  inputAmount?: string;
  pendingDepositAssets?: bigint;
  claimableDepositAssets?: number;
  claimableWithdrawAssets?: number;
  className?: string;
  onHeadroomComputed?: (headroom: HeadroomState) => void;
}

const SupplyCapHeadroom: React.FC<SupplyCapHeadroomProps> = ({
  show,
  vaultId,
  assetAddress,
  inputAmount,
  pendingDepositAssets,
  claimableDepositAssets,
  claimableWithdrawAssets,
  className,
  onHeadroomComputed,
}) => {
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { getVaultDataByAddress } = usePrice();

  const [headroom, setHeadroom] = useState<HeadroomState>({});
  const [validating, setValidating] = useState(true);
  const [assetDecimals, setAssetDecimals] = useState<number | null>(null);

  // Cached base chain state to avoid re-reading on every input change
  const vaultSuppliedRef = useRef<bigint | null>(null);
  const userSuppliedRef = useRef<bigint | null>(null);
  const userClaimableAssetsRef = useRef<bigint | null>(null);
  const [baseReady, setBaseReady] = useState(false);

  // Debounce input amount to reduce frequent evaluations during typing
  const [debouncedAmount, setDebouncedAmount] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(inputAmount), 250);
    return () => clearTimeout(t);
  }, [inputAmount]);

  // Memoized caps and requested amount
  const caps = useMemo(() => {
    return assetDecimals != null
      ? getSupplyCapsForVault(Number(assetDecimals))
      : null;
  }, [assetDecimals]);
  const requestedAssets = useMemo(() => {
    if (assetDecimals == null) return 0n;
    return debouncedAmount
      ? parseUnits(debouncedAmount, Number(assetDecimals))
      : 0n;
  }, [debouncedAmount, assetDecimals]);

  useEffect(() => {
    const info = getVaultDataByAddress?.(vaultId || "");
    const d = (info as any)?.underlyingDecimals ?? 6;
    setAssetDecimals(Number(d));
  }, [vaultId, getVaultDataByAddress]);

  // Fetch and cache base state on identity/decimals change
  useEffect(() => {
    let cancelled = false;
    const fetchBaseState = async () => {
      setBaseReady(false);
      vaultSuppliedRef.current = null;
      userSuppliedRef.current = null;
      userClaimableAssetsRef.current = null;

      try {
        if (!publicClient || !vaultId || !userAddress || assetDecimals == null)
          return;

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

        let userClaimableAssets: bigint = 0n;
        if (!(claimableDepositAssets ?? 0)) {
          userClaimableAssets = (await publicClient.readContract({
            address: vaultId as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "claimableDepositRequest",
            args: [0n, userAddress as `0x${string}`],
          })) as bigint;
        }

        if (!cancelled) {
          vaultSuppliedRef.current = vaultSupplied;
          userSuppliedRef.current = userSupplied;
          userClaimableAssetsRef.current = userClaimableAssets;
          setBaseReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setBaseReady(false);
        }
      }
    };
    fetchBaseState();
    return () => {
      cancelled = true;
    };
  }, [
    publicClient,
    vaultId,
    userAddress,
    assetDecimals,
    claimableDepositAssets,
    claimableWithdrawAssets,
  ]);

  const status = useMemo<
    "info" | "warning" | "user_error" | "vault_error"
  >(() => {
    const amt = debouncedAmount ? parseFloat(debouncedAmount) : 0;
    const userH = headroom.userHeadroom
      ? parseFloat(headroom.userHeadroom)
      : Infinity;
    const vaultH = headroom.vaultHeadroom
      ? parseFloat(headroom.vaultHeadroom)
      : Infinity;
    if (amt > vaultH) return "vault_error";
    if (amt > userH) return "user_error";
    return "info";
  }, [debouncedAmount, headroom.userHeadroom, headroom.vaultHeadroom]);

  useEffect(() => {
    let cancelled = false;
    const evaluate = async () => {
      setValidating(true);
      if (!publicClient || !vaultId || !userAddress || !assetDecimals) {
        return;
      }
      try {
        if (!baseReady || caps == null) {
          return;
        }
        const perUserCapUnits = caps.perUserCapUnits;
        const vaultCapUnits = caps.vaultCapUnits;

        const vaultSupplied = vaultSuppliedRef.current ?? 0n;
        const userSupplied = userSuppliedRef.current ?? 0n;

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

        const res: HeadroomState = {
          userHeadroom: formatUnits(userHeadroomUnits, Number(assetDecimals)),
          vaultHeadroom: formatUnits(vaultHeadroomUnits, Number(assetDecimals)),
        };
        if (!cancelled) {
          const shouldUpdate =
            headroom.userHeadroom !== res.userHeadroom ||
            headroom.vaultHeadroom !== res.vaultHeadroom;
          if (shouldUpdate) {
            setHeadroom(res);
            onHeadroomComputed?.(res);
          }
          setValidating(false);
        }
      } catch (e) {
        if (!cancelled) {
          setValidating(false);
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
    requestedAssets,
    pendingDepositAssets,
    baseReady,
  ]);

  const colorClass = useMemo(() => {
    switch (status) {
      case "user_error":
        return "text-red-600";
      case "vault_error":
        return "text-red-600";
      case "warning":
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  }, [status]);

  return (
    show && (
      <div
        className={"mt-2 text-xs" + (className ?? "")}
        role="status"
        aria-live="polite"
      >
        {!validating ||
        (headroom.userHeadroom !== undefined &&
          headroom.vaultHeadroom !== undefined) ? (
          <div className="mt-3 text-muted-foreground flex gap-3 text-center w-full">
            <div
              className={`w-full flex flex-col items-center justify-center gap-1 p-2 py-1 border rounded-md ${
                status === "user_error" ? "border-red-500" : "border-border"
              }`}
            >
              <div>Your remaining quota:</div>
              <div className="text-sm text-white">
                {Number(headroom.userHeadroom).toFixed(2)}
                <span
                  className="text-base text-muted-foreground"
                  style={{ lineHeight: "60%" }}
                >
                  {" "}
                  /
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(RAW_CAPS.perUser, "")}
                </span>
              </div>
            </div>
            <div
              className={`w-full flex flex-col items-center justify-center gap-1 p-2 py-1 border rounded-md ${
                status === "vault_error" ? "border-red-500" : "border-border"
              }`}
            >
              <div>Vault Capacity:</div>
              <div className="text-sm text-white">
                {Number(headroom.vaultHeadroom).toFixed(2)}
                <span
                  className="text-base text-muted-foreground"
                  style={{ lineHeight: "60%" }}
                >
                  {" "}
                  /
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(RAW_CAPS.vault, "")}
                </span>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    )
  );
};

export default React.memo(SupplyCapHeadroom);
