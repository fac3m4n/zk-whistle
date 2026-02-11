"use client";

import { useCallback, useState } from "react";
import { fetchFromArweave, getArweaveUrl, uploadToArweave } from "~~/services/zk-whistle/irysUpload";
import type { ArweavePayloadMetadata } from "~~/types/zk-whistle";

type IrysUploadState = {
  isUploading: boolean;
  isFetching: boolean;
  error: string | null;
  arweaveTxId: string | null;
  fetchedData: Uint8Array | null;
};

/**
 * React hook for uploading and fetching encrypted payloads to/from Arweave via Irys.
 */
export function useIrysUpload() {
  const [state, setState] = useState<IrysUploadState>({
    isUploading: false,
    isFetching: false,
    error: null,
    arweaveTxId: null,
    fetchedData: null,
  });

  /**
   * Upload encrypted data to Arweave.
   */
  const upload = useCallback(
    async (
      encryptedData: Uint8Array,
      metadata: ArweavePayloadMetadata,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walletProvider?: any,
    ): Promise<string | null> => {
      setState(prev => ({ ...prev, isUploading: true, error: null }));

      try {
        const txId = await uploadToArweave(encryptedData, metadata, walletProvider);
        setState(prev => ({
          ...prev,
          isUploading: false,
          arweaveTxId: txId,
        }));
        return txId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setState(prev => ({
          ...prev,
          isUploading: false,
          error: message,
        }));
        return null;
      }
    },
    [],
  );

  /**
   * Fetch encrypted data from Arweave.
   */
  const fetchData = useCallback(async (txId: string): Promise<Uint8Array | null> => {
    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const data = await fetchFromArweave(txId);
      setState(prev => ({
        ...prev,
        isFetching: false,
        fetchedData: data,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fetch failed";
      setState(prev => ({
        ...prev,
        isFetching: false,
        error: message,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      isFetching: false,
      error: null,
      arweaveTxId: null,
      fetchedData: null,
    });
  }, []);

  return {
    ...state,
    upload,
    fetchData,
    reset,
    getArweaveUrl,
  };
}
