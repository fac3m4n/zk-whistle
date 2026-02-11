"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUpTrayIcon, DocumentIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useClientEncryption } from "~~/hooks/zk-whistle/useClientEncryption";
import type { EncryptedPayload } from "~~/types/zk-whistle";

type FileEncryptorProps = {
  onEncrypted: (payload: EncryptedPayload, fileName: string, mimeType: string) => void;
};

/**
 * Drag-and-drop file encryption component.
 * Encrypts the selected file client-side using AES-256-GCM.
 */
export const FileEncryptor = ({ onEncrypted }: FileEncryptorProps) => {
  const { encrypt, isEncrypting, error } = useClientEncryption();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setSelectedFile(file);

      try {
        const payload = await encrypt(file);
        if (payload) {
          onEncrypted(payload, file.name, file.type);
        }
      } catch {
        // Error handled in hook state
      }
    },
    [encrypt, onEncrypted],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
          isDragOver ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"
        }`}
        onDragOver={e => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

        {isEncrypting ? (
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="font-medium">Encrypting with AES-256-GCM...</p>
            <p className="text-sm text-base-content/50">All encryption happens in your browser</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <LockClosedIcon className="h-12 w-12 text-success" />
            <div className="flex items-center gap-2">
              <DocumentIcon className="h-5 w-5" />
              <span className="font-medium">{selectedFile.name}</span>
              <span className="badge badge-sm">{formatFileSize(selectedFile.size)}</span>
            </div>
            <p className="text-sm text-success">Encrypted successfully</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <ArrowUpTrayIcon className="h-12 w-12 text-base-content/30" />
            <p className="font-medium">Drop a file here or click to select</p>
            <p className="text-sm text-base-content/50">Files are encrypted client-side before upload</p>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
