import { useState, useCallback } from "react";
import { ArrowLeft, Phone, Delete, UserCheck, UserX } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { normalizeUser } from "../../lib/api";
import type { User } from "../../types";

interface DialpadPanelProps {
  open: boolean;
  onClose: () => void;
  onCallUser: (userId: string, withVideo: boolean) => void;
}

const DIALPAD_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "+", letters: "" },
  { digit: "0", letters: "" },
  { digit: "⌫", letters: "" },
];

interface LookupResult {
  found: boolean;
  user?: User;
}

export function DialpadPanel({
  open,
  onClose,
  onCallUser,
}: DialpadPanelProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "⌫") {
        setPhoneNumber((prev) => prev.slice(0, -1));
        setLookupResult(null);
      } else {
        setPhoneNumber((prev) => prev + key);
        setLookupResult(null);
      }
    },
    [],
  );

  const handleLookup = useCallback(async () => {
    if (phoneNumber.length < 4) return;
    setIsSearching(true);
    try {
      const data = await apiFetch<{ found: boolean; user?: Record<string, any> }>(
        `/users/lookup-phone?phone=${encodeURIComponent(phoneNumber)}`,
      );
      if (data.found && data.user) {
        setLookupResult({ found: true, user: normalizeUser(data.user) });
      } else {
        setLookupResult({ found: false });
      }
    } catch {
      setLookupResult({ found: false });
    } finally {
      setIsSearching(false);
    }
  }, [phoneNumber]);

  const handleCall = useCallback(() => {
    if (lookupResult?.found && lookupResult.user) {
      onCallUser(lookupResult.user.id, false);
      onClose();
      setPhoneNumber("");
      setLookupResult(null);
    }
  }, [lookupResult, onCallUser, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[56px] shrink-0 border-b border-border">
        <button
          onClick={() => {
            onClose();
            setPhoneNumber("");
            setLookupResult(null);
          }}
          title="Back"
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[15px] font-semibold text-text-main">
          Phone number
        </h2>
      </div>

      {/* Phone number display */}
      <div className="px-5 pt-4 pb-2">
        <div className="relative">
          <input
            type="text"
            value={phoneNumber}
            readOnly
            placeholder="Enter a phone number to start a chat"
            className="w-full text-[16px] text-text-main bg-transparent outline-none pb-2 border-b-2 border-accent placeholder:text-text-secondary/60 text-center"
          />
        </div>
        <p className="text-[12px] text-text-secondary mt-2 text-center">
          Enter a phone number to find a user on Ephemeral
        </p>
      </div>

      {/* Lookup result */}
      {lookupResult && (
        <div className="px-5 py-3">
          {lookupResult.found && lookupResult.user ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
              <UserCheck className="w-5 h-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-main truncate">
                  {lookupResult.user.displayName}
                </p>
                <p className="text-[12px] text-accent">Found on Ephemeral</p>
              </div>
              <button
                onClick={handleCall}
                title="Call"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white hover:brightness-110 transition-all"
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-danger/5 border border-danger/20">
              <UserX className="w-5 h-5 text-danger shrink-0" />
              <div className="flex-1">
                <p className="text-[14px] font-medium text-text-main">
                  Not on Ephemeral
                </p>
                <p className="text-[12px] text-text-secondary">
                  This number is not registered
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialpad */}
      <div className="flex-1 flex flex-col justify-center px-8 pb-4">
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {DIALPAD_KEYS.map((key) => (
            <button
              key={key.digit}
              onClick={() => handleKeyPress(key.digit)}
              className="flex flex-col items-center justify-center w-[72px] h-[72px] rounded-full hover:bg-input/80 transition-colors mx-auto"
            >
              <span className="text-[24px] font-light text-text-main leading-none">
                {key.digit}
              </span>
              {key.letters && (
                <span className="text-[10px] font-medium text-text-secondary tracking-widest mt-0.5">
                  {key.letters}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLookup}
            disabled={phoneNumber.length < 4 || isSearching}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-medium bg-accent text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Phone className="w-4 h-4" />
            {isSearching ? "Searching..." : "Search & call"}
          </button>
        </div>
      </div>
    </div>
  );
}
