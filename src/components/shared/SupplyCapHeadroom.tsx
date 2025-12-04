import React, { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { getSupplyCapsForVault, RAW_CAPS } from "@/services/supplyCaps";
import { formatCurrency } from "@/utils/currency";
import { useMultiVault } from "@/hooks/useMultiVault";

interface HeadroomState {
  userHeadroom?: string;
  vaultHeadroom?: string;
}

interface SupplyCapHeadroomProps {
  show: boolean;
  vaultId?: string;
  inputAmount?: string;
  pendingDepositAssets: bigint;
  claimableDepositAssets: number;
  pendingRedeemShares: bigint;
  totalPendingDeposits?: bigint;
  totalPendingWithdrawals?: bigint;
  className?: string;
  onHeadroomComputed?: (headroom: HeadroomState) => void;
}

const SupplyCapHeadroom: React.FC<SupplyCapHeadroomProps> = ({
  show,
  vaultId,
  inputAmount,
  pendingDepositAssets,
  claimableDepositAssets,
  pendingRedeemShares,
  totalPendingDeposits,
  totalPendingWithdrawals,
  className,
  onHeadroomComputed,
}) => {
  const { getVaultByAddress } = useMultiVault();

  const vaultData = useMemo(
    () => getVaultByAddress(vaultId || ""),
    [getVaultByAddress, vaultId]
  );

  const [headroom, setHeadroom] = useState<HeadroomState>({});
  const [validatingUser, setValidatingUser] = useState(true);
  const [validatingVault, setValidatingVault] = useState(true);

  const validating = validatingUser || validatingVault;

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
    if (vaultData?.assetDecimals)
      return getSupplyCapsForVault(vaultData.assetDecimals);
  }, [vaultData]);

  const requestedAssets = useMemo(() => {
    if (vaultData?.assetDecimals)
      return debouncedAmount
        ? parseUnits(debouncedAmount, vaultData.assetDecimals)
        : 0n;
  }, [debouncedAmount, vaultData]);

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

  // User Headroom
  useEffect(() => {
    let cancelled = false;
    const evaluateUserHeadroom = async () => {
      setValidatingUser(true);
      try {
        if (!vaultId || !vaultData || caps == null) {
          setValidatingUser(false);
          return;
        }
        const perUserCapUnits = caps.perUserCapUnits;

        const userSupplied =
          parseUnits(String(vaultData.userDeposits), vaultData.assetDecimals) ??
          0n;
        const claimableDepositAssetsUnits = parseUnits(
          String(claimableDepositAssets ?? 0),
          vaultData.assetDecimals
        );

        const pendingAmount =
          pendingDepositAssets > 0n
            ? pendingDepositAssets
            : claimableDepositAssetsUnits;
        const userEffective = userSupplied + pendingAmount;

        const userHeadroomUnits =
          perUserCapUnits > userEffective
            ? perUserCapUnits - userEffective
            : 0n;

        const userHeadroomFormatted = formatUnits(
          userHeadroomUnits,
          vaultData.assetDecimals
        );

        if (!cancelled) {
          setHeadroom((prev) => {
            if (prev.userHeadroom !== userHeadroomFormatted) {
              const next = { ...prev, userHeadroom: userHeadroomFormatted };
              return next;
            }
            return prev;
          });
          setValidatingUser(false);
        }
      } catch (e) {
        if (!cancelled) {
          setValidatingUser(false);
        }
      }
    };
    evaluateUserHeadroom();
    return () => {
      cancelled = true;
    };
  }, [
    vaultId,
    caps,
    vaultData?.userDeposits,
    vaultData?.assetDecimals,
    pendingDepositAssets,
    claimableDepositAssets,
  ]);

  // Vault Headroom 
  useEffect(() => {
    let cancelled = false;
    const evaluateVaultHeadroom = async () => {
      setValidatingVault(true);
      try {
        if (!vaultId || !vaultData || caps == null) {
          setValidatingVault(false);
          return;
        }
        const vaultCapUnits = caps.vaultCapUnits;

        const vaultSupplied =
          parseUnits(String(vaultData.totalAssets), vaultData.assetDecimals) ??
          0n;

        const vaultEffectiveSupplied =
          (vaultSupplied ?? 0n) +
          (totalPendingDeposits ?? 0n) -
          (totalPendingWithdrawals ?? 0n);

        const vaultHeadroomUnits =
          vaultCapUnits > vaultEffectiveSupplied
            ? vaultCapUnits - vaultEffectiveSupplied
            : 0n;

        const vaultHeadroomUnitsFinal =
          vaultCapUnits < vaultHeadroomUnits
            ? caps.vaultCapUnits - vaultSupplied
            : vaultHeadroomUnits;

        const vaultHeadroomFormatted = formatUnits(
          vaultHeadroomUnitsFinal,
          vaultData.assetDecimals
        );

        if (!cancelled) {
          setHeadroom((prev) => {
            if (prev.vaultHeadroom !== vaultHeadroomFormatted) {
              return { ...prev, vaultHeadroom: vaultHeadroomFormatted };
            }
            return prev;
          });
          setValidatingVault(false);
        }
      } catch (e) {
        if (!cancelled) {
          setValidatingVault(false);
        }
      }
    };
    evaluateVaultHeadroom();
    return () => {
      cancelled = true;
    };
  }, [
    vaultId,
    caps,
    vaultData?.totalAssets,
    vaultData?.assetDecimals,
    totalPendingDeposits,
    totalPendingWithdrawals,
  ]);

  useEffect(() => {
    onHeadroomComputed?.(headroom);
  }, [headroom, onHeadroomComputed]);

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
