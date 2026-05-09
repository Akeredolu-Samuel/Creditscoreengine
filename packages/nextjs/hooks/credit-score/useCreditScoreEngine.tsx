"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAllow, useEncrypt, useIsAllowed, useUserDecrypt } from "@zama-fhe/react-sdk";
import { ZERO_HANDLE, ZamaSDKEvents } from "@zama-fhe/sdk";
import { bytesToHex } from "viem";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { CreditScoreEngine, CreditScoreEngineABI } from "~~/contracts/CreditScoreEngine";
import { deploymentFor } from "~~/utils/contract";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreditFactorInputs {
  paymentHistory: number; // 0-100
  dti: number; // 0-100
  creditAge: number; // 0-100
  utilization: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useCreditScoreEngine — wagmi + @zama-fhe/react-sdk integration for the
 * CreditScoreEngine contract.
 *
 * Covers both borrower flows (submit factors, authorize/revoke lenders,
 * self-decrypt score) and lender flows (request + decrypt score for a
 * borrower they are authorised for).
 */
export const useCreditScoreEngine = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const deployment = useMemo(() => deploymentFor(CreditScoreEngine, chainId), [chainId]);
  const contractAddress = deployment?.address;
  const abi = CreditScoreEngineABI;
  const hasContract = Boolean(contractAddress);

  // ── Status message ────────────────────────────────────────────────────────
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Zama SDK events ───────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    const { CredentialsCached, DecryptEnd } = ZamaSDKEvents;
    window.addEventListener(CredentialsCached, () => setMessage("Credentials cached — decrypting…"), {
      signal: ctrl.signal,
    });
    window.addEventListener(DecryptEnd, () => setMessage("Decryption complete!"), {
      signal: ctrl.signal,
    });
    return () => ctrl.abort();
  }, []);

  // ── wagmi helpers ─────────────────────────────────────────────────────────
  const encrypt = useEncrypt();
  const { writeContractAsync } = useWriteContract();

  // ── hasSubmitted ──────────────────────────────────────────────────────────
  const hasSubmittedResult = useReadContract({
    address: contractAddress,
    abi,
    functionName: "hasSubmitted",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: Boolean(hasContract && isConnected && address), refetchOnWindowFocus: false },
  });
  const borrowerHasSubmitted = Boolean(hasSubmittedResult.data);

  // ── getMyScore handle ─────────────────────────────────────────────────────
  const myScoreResult = useReadContract({
    address: contractAddress,
    abi,
    functionName: "getMyScore",
    query: {
      enabled: Boolean(hasContract && isConnected && borrowerHasSubmitted),
      refetchOnWindowFocus: false,
    },
  });
  const myScoreHandle = useMemo(() => (myScoreResult.data as string | undefined) ?? undefined, [myScoreResult.data]);

  // ── ACL & decrypt (own score) ──────────────────────────────────────────────
  const { mutate: allow, isPending: isAllowing } = useAllow();
  const { data: isAllowed } = useIsAllowed({
    contractAddresses: [contractAddress || "0x0000000000000000000000000000000000000000"],
  });

  const ownDecryptHandles = useMemo(() => {
    if (!myScoreHandle || myScoreHandle === ZERO_HANDLE || !contractAddress) return [];
    return [{ handle: myScoreHandle as `0x${string}`, contractAddress }];
  }, [myScoreHandle, contractAddress]);

  const [ownDecryptEnabled, setOwnDecryptEnabled] = useState(false);
  const ownDecrypt = useUserDecrypt(
    { handles: ownDecryptHandles },
    { enabled: ownDecryptEnabled && Boolean(isAllowed) },
  );

  const ownClearScore = useMemo(() => {
    if (!myScoreHandle || !ownDecrypt.data) return undefined;
    return ownDecrypt.data[myScoreHandle as `0x${string}`];
  }, [myScoreHandle, ownDecrypt.data]);

  const decryptOwnScore = useCallback(async () => {
    if (!contractAddress) return;
    setOwnDecryptEnabled(true);
    if (!isAllowed) {
      setMessage("Authorising KMS access…");
      allow([contractAddress]);
    } else {
      setMessage("Decrypting your score…");
    }
  }, [contractAddress, isAllowed, allow]);

  // ── Lender: request score handle for a borrower ───────────────────────────
  const [lenderTargetBorrower, setLenderTargetBorrower] = useState<`0x${string}` | undefined>();

  const lenderScoreResult = useReadContract({
    address: contractAddress,
    abi,
    functionName: "requestScore",
    args: [lenderTargetBorrower ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: Boolean(hasContract && isConnected && lenderTargetBorrower),
      refetchOnWindowFocus: false,
    },
  });
  const lenderScoreHandle = useMemo(
    () => (lenderScoreResult.data as string | undefined) ?? undefined,
    [lenderScoreResult.data],
  );

  const lenderDecryptHandles = useMemo(() => {
    if (!lenderScoreHandle || lenderScoreHandle === ZERO_HANDLE || !contractAddress) return [];
    return [{ handle: lenderScoreHandle as `0x${string}`, contractAddress }];
  }, [lenderScoreHandle, contractAddress]);

  const [lenderDecryptEnabled, setLenderDecryptEnabled] = useState(false);
  const lenderDecrypt = useUserDecrypt(
    { handles: lenderDecryptHandles },
    { enabled: lenderDecryptEnabled && Boolean(isAllowed) },
  );

  const lenderClearScore = useMemo(() => {
    if (!lenderScoreHandle || !lenderDecrypt.data) return undefined;
    return lenderDecrypt.data[lenderScoreHandle as `0x${string}`];
  }, [lenderScoreHandle, lenderDecrypt.data]);

  const requestAndDecryptScore = useCallback(
    async (borrower: `0x${string}`) => {
      setLenderTargetBorrower(borrower);
      setLenderDecryptEnabled(true);
      if (!isAllowed) {
        setMessage("Authorising KMS for lender decrypt…");
        if (contractAddress) allow([contractAddress]);
      } else {
        setMessage("Fetching & decrypting score…");
        await lenderScoreResult.refetch();
      }
    },
    [contractAddress, isAllowed, allow, lenderScoreResult],
  );

  // ── Submit factors (borrower) ─────────────────────────────────────────────
  const submitFactors = useCallback(
    async (factors: CreditFactorInputs) => {
      if (!address || !contractAddress) return;
      setIsProcessing(true);
      setMessage("Encrypting credit factors under FHE…");
      try {
        const enc = await encrypt.mutateAsync({
          values: [
            { value: BigInt(factors.paymentHistory), type: "euint64" },
            { value: BigInt(factors.dti), type: "euint64" },
            { value: BigInt(factors.creditAge), type: "euint64" },
            { value: BigInt(factors.utilization), type: "euint64" },
          ],
          contractAddress,
          userAddress: address,
        });

        setMessage("Sending transaction…");
        await writeContractAsync({
          address: contractAddress,
          abi,
          functionName: "submitFactors",
          args: [
            bytesToHex(enc.handles[0]!),
            bytesToHex(enc.handles[1]!),
            bytesToHex(enc.handles[2]!),
            bytesToHex(enc.handles[3]!),
            bytesToHex(enc.inputProof),
          ],
          gas: 15_000_000n,
        });

        setMessage("Factors submitted! Score computed on-chain under FHE ✓");
        await hasSubmittedResult.refetch();
        await myScoreResult.refetch();
      } catch (e) {
        setMessage(`Submit failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [address, contractAddress, encrypt, writeContractAsync, abi, hasSubmittedResult, myScoreResult],
  );

  // ── Authorize lender ──────────────────────────────────────────────────────
  const authorizeLender = useCallback(
    async (lender: `0x${string}`) => {
      if (!contractAddress) return;
      setIsProcessing(true);
      setMessage(`Authorising ${lender}…`);
      try {
        await writeContractAsync({
          address: contractAddress,
          abi,
          functionName: "authorizeLender",
          args: [lender],
          gas: 500_000n,
        });
        setMessage("Lender authorised! They can now decrypt your score ✓");
      } catch (e) {
        setMessage(`Authorise failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [contractAddress, writeContractAsync, abi],
  );

  // ── Revoke lender ─────────────────────────────────────────────────────────
  const revokeLender = useCallback(
    async (lender: `0x${string}`) => {
      if (!contractAddress) return;
      setIsProcessing(true);
      setMessage(`Revoking ${lender}…`);
      try {
        await writeContractAsync({
          address: contractAddress,
          abi,
          functionName: "revokeLender",
          args: [lender],
          gas: 100_000n,
        });
        setMessage("Lender access revoked ✓");
      } catch (e) {
        setMessage(`Revoke failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [contractAddress, writeContractAsync, abi],
  );

  // ── Check lender authorization ────────────────────────────────────────────
  const checkLenderAuth = useCallback(
    async () => {
      // Quick read via the result refetch pattern
      return lenderScoreResult
        .refetch()
        .then(() => true)
        .catch(() => false);
    },
    [lenderScoreResult],
  );

  return {
    // state
    contractAddress,
    hasContract,
    isProcessing,
    message,
    // borrower
    borrowerHasSubmitted,
    submitFactors,
    myScoreHandle,
    ownClearScore,
    decryptOwnScore,
    isDecryptingOwn: ownDecrypt.isFetching,
    isAllowing,
    // authorize
    authorizeLender,
    revokeLender,
    // lender
    requestAndDecryptScore,
    lenderClearScore,
    lenderScoreHandle,
    isDecryptingLender: lenderDecrypt.isFetching,
    lenderTargetBorrower,
    checkLenderAuth,
    // refetch helpers
    refreshMyScore: myScoreResult.refetch,
  };
};
