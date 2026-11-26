import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Loader2, 
  Trash2, 
  KeyRound, 
  CheckCircle2,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { ToolDefinition, UploadedFileItem, ProcessResult } from '../../types';
import { DropZone } from '../DropZone';
import { formatBytes, protectPdf, unlockPdf, changePdfPassword } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import { LockedFeatureGate } from '../auth/LockedFeatureGate';
import { PdfThumbnailPreview } from '../preview/PdfThumbnailPreview';

interface ProtectWorkspaceProps {
  tool: ToolDefinition;
  onSuccess: (result: ProcessResult) => void;
}

type ProtectMode = 'encrypt' | 'unlock' | 'change';

export const ProtectWorkspace: React.FC<ProtectWorkspaceProps> = ({ tool, onSuccess }) => {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<ProtectMode>('encrypt');
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  
  // Encrypt & Change mode fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Current password for Unlock & Change
  const [currentPassword, setCurrentPassword] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Security Permissions
  const [preventPrinting, setPreventPrinting] = useState(false);
  const [preventCopying, setPreventCopying] = useState(false);
  const [preventModifying, setPreventModifying] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileItem = files[0];

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleExecute = async () => {
    if (!fileItem) return;
    setError(null);

    // Validate inputs per mode
    if (mode === 'encrypt') {
      if (!password) {
        setError('Please enter a document password to protect your PDF.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your entries.');
        return;
      }
    } else if (mode === 'unlock') {
      // Current password can be empty if only standard restrictions need to be stripped,
      // but if encrypted, unlockPdf will check or prompt
    } else if (mode === 'change') {
      if (!currentPassword) {
        setError('Please enter the current document password.');
        return;
      }
      if (!password) {
        setError('Please enter the new password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('New passwords do not match. Please verify your entries.');
        return;
      }
    }

    setIsProcessing(true);
    setProgress(15);

    try {
      if (mode === 'encrypt') {
        const protectedBytes = await protectPdf(
          fileItem.file,
          password,
          ownerPassword || (password + '_owner'),
          {
            printing: preventPrinting ? 'none' : 'highResolution',
            copying: !preventCopying,
            modifying: !preventModifying,
            annotating: !preventModifying,
          },
          (p) => setProgress(p)
        );

        const blob = new Blob([protectedBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadFilename = fileItem.name.replace(/\.pdf$/i, '_protected.pdf');

        onSuccess({
          title: `PDF encrypted with standard user/owner passwords!`,
          success: true,
          downloadUrl,
          downloadFilename,
          fileSize: blob.size,
          blob,
        });
      } else if (mode === 'unlock') {
        const unlockedBytes = await unlockPdf(
          fileItem.file,
          currentPassword,
          (p) => setProgress(p)
        );

        const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadFilename = fileItem.name.replace(/\.pdf$/i, '_unlocked.pdf');

        onSuccess({
          title: `PDF unlocked! Passwords & restrictions permanently removed.`,
          success: true,
          downloadUrl,
          downloadFilename,
          fileSize: blob.size,
          blob,
        });
      } else if (mode === 'change') {
        const updatedBytes = await changePdfPassword(
          fileItem.file,
          currentPassword,
          password,
          ownerPassword || (password + '_owner'),
          {
            printing: preventPrinting ? 'none' : 'highResolution',
            copying: !preventCopying,
            modifying: !preventModifying,
            annotating: !preventModifying,
          },
          (p) => setProgress(p)
        );

        const blob = new Blob([updatedBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadFilename = fileItem.name.replace(/\.pdf$/i, '_new_password.pdf');

        onSuccess({
          title: `PDF password and permissions successfully updated!`,
          success: true,
          downloadUrl,
          downloadFilename,
          fileSize: blob.size,
          blob,
        });
      }
    } catch (err: any) {
      console.error('Security operation error:', err);
      setError(err?.message || 'Failed to process PDF security.');
      setIsProcessing(false);
    }
  };

  // If user is not authenticated, show the friendly unlock gate
  if (!isAuthenticated) {
    return (
      <LockedFeatureGate
        featureName="PDF Encryption & Password Protection"
        description="Encrypt documents with 128/256-bit passwords, customize owner & user permissions, or remove restrictions completely. Sign in or create a free account to unlock instantly!"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mode Selector Tabs */}
      <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 border border-gray-200">
        <button
          type="button"
          onClick={() => {
            setMode('encrypt');
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'encrypt'
              ? 'bg-white text-orange-600 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Set Password (Encrypt)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('unlock');
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'unlock'
              ? 'bg-white text-emerald-600 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>Remove Password (Unlock)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('change');
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'change'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Edit / Change Password</span>
        </button>
      </div>

      {!fileItem ? (
        <DropZone
          tool={tool}
          files={files}
          onFilesChange={setFiles}
          title={
            mode === 'encrypt'
              ? 'Drop PDF to set password & encrypt'
              : mode === 'unlock'
              ? 'Drop protected PDF to remove password'
              : 'Drop PDF to change/edit password'
          }
          subtitle={
            mode === 'encrypt'
              ? 'Encrypt your PDF with standard user & owner passwords and custom permissions.'
              : mode === 'unlock'
              ? 'Permanently remove open passwords and edit/print restrictions.'
              : 'Provide current password to set a new password and update security flags.'
          }
        />
      ) : (
        <div className="space-y-6">
          <PdfThumbnailPreview
            file={fileItem.file}
            fileName={fileItem.name}
            fileSize={fileItem.size}
            title="PDF Security Preview"
            subtitle="Preview document before applying security settings"
            onRemove={() => setFiles([])}
          />
          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                mode === 'encrypt' 
                  ? 'bg-orange-100 text-orange-600' 
                  : mode === 'unlock' 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {mode === 'encrypt' && <Lock className="w-5 h-5" />}
                {mode === 'unlock' && <Unlock className="w-5 h-5" />}
                {mode === 'change' && <RefreshCw className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{fileItem.name}</h3>
                <p className="text-xs text-gray-500">{formatBytes(fileItem.size)}</p>
              </div>
            </div>

            <button
              onClick={() => setFiles([])}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove file"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* MODE 1: ENCRYPT (SET PASSWORD) */}
          {mode === 'encrypt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Set User / Document Password (Required to Open):
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 focus:border-orange-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600">{strength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your password"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 focus:border-orange-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Advanced Owner Password */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Owner Password & Permissions'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 p-4 bg-orange-50/60 rounded-2xl border border-orange-200/70">
                    <div>
                      <label className="block text-xs font-bold text-orange-950 uppercase tracking-wide mb-1">
                        Optional Owner / Permissions Password:
                      </label>
                      <input
                        type="text"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Leave blank to use auto-generated owner key"
                        className="w-full px-3.5 py-2 bg-white border border-orange-200 rounded-xl text-xs outline-none"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Owner password allows changing permissions without user password.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-orange-200/60 space-y-2">
                      <div className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                        Restrictions:
                      </div>
                      <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventPrinting}
                          onChange={(e) => setPreventPrinting(e.target.checked)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                        />
                        <span>Restrict high-resolution printing</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventCopying}
                          onChange={(e) => setPreventCopying(e.target.checked)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                        />
                        <span>Prevent copying text and images</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventModifying}
                          onChange={(e) => setPreventModifying(e.target.checked)}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                        />
                        <span>Restrict modifications and form filling</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: UNLOCK (REMOVE PASSWORD) */}
          {mode === 'unlock' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Permanent Password & Restriction Removal</span>
                </div>
                Enter the current document password below. The decrypted PDF will be completely unlocked, allowing anyone to open, print, and copy without prompts.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Current Document Password:
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter the PDF password"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 focus:border-emerald-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: CHANGE (EDIT PASSWORD) */}
          {mode === 'change' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  1. Current Password:
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  2. New Document Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-2xl text-sm outline-none font-medium"
                  />
                  <CheckCircle2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {mode === 'encrypt' && 'Protected with standard user & owner encryption.'}
              {mode === 'unlock' && 'Completely removes password protection.'}
              {mode === 'change' && 'Replaces existing password credentials.'}
            </div>

            <button
              id="execute-protect-btn"
              onClick={handleExecute}
              disabled={
                isProcessing || 
                (mode === 'encrypt' && !password) ||
                (mode === 'change' && (!currentPassword || !password))
              }
              className={`px-8 py-3.5 text-white font-bold rounded-full text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:bg-gray-300 ${
                mode === 'encrypt'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : mode === 'unlock'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {mode === 'encrypt' && `Encrypting PDF (${progress}%)...`}
                    {mode === 'unlock' && `Unlocking PDF (${progress}%)...`}
                    {mode === 'change' && `Updating Password (${progress}%)...`}
                  </span>
                </>
              ) : (
                <>
                  {mode === 'encrypt' && (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Protect PDF Now</span>
                    </>
                  )}
                  {mode === 'unlock' && (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Remove Password & Unlock</span>
                    </>
                  )}
                  {mode === 'change' && (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Save New Password</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
