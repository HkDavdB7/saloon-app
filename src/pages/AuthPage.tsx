import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Scissors, ArrowLeft, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/hooks/useLanguage';

const roleRoutes = {
  customer: '/',
  stylist_admin: '/owner/dashboard',
  stylist: '/stylist/schedule',
  admin: '/admin',
} as const;

const RESEND_COOLDOWN = 60;

// Translate Supabase auth error messages to Arabic
const tAuthError = (msg: string | undefined): string => {
  if (!msg) return '';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'بيانات الدخول غير صحيحة';
  if (m.includes('email not confirmed')) return 'لم يتم تأكيد البريد الإلكتروني';
  if (m.includes('already registered')) return 'هذا البريد مسجل مسبقاً';
  if (m.includes('invalid otp') || m.includes('invalid code')) return 'الرمز غير صحيح';
  if (m.includes('expired')) return 'انتهت صلاحية الرمز';
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة، حاول لاحقاً';
  return msg;
};

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = Math.min(2, local.length);
  return local.slice(0, visible) + '****@' + domain;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Email-only auth — phone removed from UI
  const [email, setEmail] = useState('');
  const [emailForVerification, setEmailForVerification] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [awaitingPasswordSetup, setAwaitingPasswordSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useLanguage()

  useEffect(() => {
    if (awaitingPasswordSetup) return;
    if (!authLoading && session) {
      if (profile?.role) {
        navigate(roleRoutes[profile.role], { replace: true });
      } else {
        navigate('/setup', { replace: true });
      }
    }
  }, [authLoading, session, profile, navigate, awaitingPasswordSetup]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetAuthState = () => {
    setError('');
    setEmailError('');
    setOtpSent(false);
    setOtp('');
    setEmailForVerification('');
    setLoginPassword('');
    setSetupPassword('');
    setConfirmPassword('');
    setAwaitingPasswordSetup(false);
    setForgotPassword(false);
    setResetSent(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0);
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    if (mode === nextMode) return;
    setMode(nextMode);
    resetAuthState();
  };

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('auth.enterEmail'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError(t('auth.invalidEmail'));
      return false;
    }
    setEmailError('');
    return true;
  };

  // OTP — only used in register mode
  const handleSendOtp = async () => {
    if (!validateEmail(email)) return;
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      if (otpError) throw otpError;
      setEmailForVerification(email);
      setOtp('');
      setError('');
      setOtpSent(true);
      startResendTimer();
    } catch (err: any) {
      setError(tAuthError(err.message) || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Password login — only used in login mode
  const handlePasswordLogin = async () => {
    if (!validateEmail(email)) return;
    if (!loginPassword) {
      setError(t('auth.enterPassword'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
        options: {
          persistSession: rememberMe,
        },
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(tAuthError(err.message) || t('auth.signInError'));
    } finally {
      setLoading(false);
    }
  };

  // Forgot password — sends reset email
  const handleForgotPassword = async () => {
    if (!validateEmail(email)) return;
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: any) {
      setError(tAuthError(err.message) || 'تعذر إرسال البريد');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t('auth.enterOtp'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = otp.replace(/\s+/g, '');
      const emailToVerify = emailForVerification || email;
      let { error: emailErr } = await supabase.auth.verifyOtp({ email: emailToVerify, token, type: 'email' });
      if (emailErr) {
        const { error: magicError } = await supabase.auth.verifyOtp({ email: emailToVerify, token, type: 'magiclink' });
        if (magicError) {
          setError(magicError.message);
          return;
        }
      }

      // Check if user already has a role — skip password setup for existing users
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionData.session.user.id)
          .single();

        if (profileData?.role) {
          setOtpSent(false);
          setAwaitingPasswordSetup(false);
          await refreshProfile();
          return;
        }

        // New user — create profile row so they can log in with password after setup
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: sessionData.session.user.id, role: 'customer' });

        if (profileError) {
          console.error('Profile creation failed:', profileError);
        }
      }

      setOtpSent(false);
      setAwaitingPasswordSetup(true);
    } catch (err: any) {
      setError(tAuthError(err.message) || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!setupPassword || setupPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (setupPassword !== confirmPassword) {
      setError(t('auth.passwordMustMatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError(t('auth.sessionNotReady'));
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: setupPassword });
      if (updateError) throw updateError;
      setAwaitingPasswordSetup(false);
      setSetupPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(tAuthError(err.message) || 'تعذر تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password View ──
  if (forgotPassword) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" dir="rtl">
        <div className="w-full max-w-sm animate-fade-in">
          <button
            onClick={() => { setForgotPassword(false); setResetSent(false); setError(''); }}
            className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToLogin')}
          </button>

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full rose-gradient">
              <Scissors className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t('auth.resetPassword')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {resetSent ? t('auth.checkEmail') : t('auth.enterEmailForReset')}
            </p>
          </div>

          {!resetSent ? (
            <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder={t('auth.enterEmail')}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  className="border-border bg-secondary text-secondary-foreground placeholder:text-muted-foreground"
                />
                {emailError && <p className="mt-1.5 text-xs text-destructive">{emailError}</p>}
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rose-gradient py-5 font-semibold text-primary-foreground hover:opacity-90"
              >
                {loading ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
                {t('auth.sendResetLink')}
              </Button>
            </form>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.codeSent')} <strong className="text-foreground">{maskEmail(email)}</strong>. {t('auth.checkInbox')}
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-sm animate-fade-in">
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full rose-gradient">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {awaitingPasswordSetup
              ? t('auth.setPassword')
              : otpSent
                ? t('auth.verify')
                : mode === 'login'
                  ? t('auth.welcomeBack')
                  : t('auth.getStarted')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {awaitingPasswordSetup
              ? t('auth.setPassword')
              : otpSent
                ? `${t('auth.codeSent')} ${maskEmail(email)}`
                : mode === 'login'
                  ? t('auth.enterEmail')
                  : t('auth.sendOtp')}
          </p>
        </div>

        {/* Mode toggle */}
        {!awaitingPasswordSetup && !otpSent && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => switchMode('login')}
              className={`flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'rose-gradient text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:opacity-80'
              }`}
            >
              {t('auth.existingUser')}
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'rose-gradient text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:opacity-80'
              }`}
            >
              {t('auth.newUser')}
            </button>
          </div>
        )}

        {/* Main form area */}
        {!awaitingPasswordSetup && !otpSent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === 'login') handlePasswordLogin();
              else handleSendOtp();
            }}
            className="space-y-4"
          >
            <div>
              <Input
                type="email"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                className="border-border bg-secondary text-secondary-foreground placeholder:text-muted-foreground"
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-destructive">{emailError}</p>
              )}
            </div>

            {/* Login mode: password field + remember me + forgot password */}
            {mode === 'login' && (
              <>
                <Input
                  type="password"
                  placeholder={t('auth.enterPassword')}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="border-border bg-secondary text-secondary-foreground placeholder:text-muted-foreground"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                      {t('auth.rememberMe')}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setError(''); }}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rose-gradient py-5 font-semibold text-primary-foreground hover:opacity-90"
            >
              {loading ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              {mode === 'login' ? t('auth.signIn') : t('auth.sendOtp')}
            </Button>
          </form>
        ) : awaitingPasswordSetup ? (
          <div className="space-y-4">
            <Input
              type="password"
              placeholder={t('auth.createPassword')}
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              className="border-border bg-secondary text-secondary-foreground placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-border bg-secondary text-secondary-foreground placeholder:text-muted-foreground"
            />
            <Button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full rose-gradient py-5 font-semibold text-primary-foreground hover:opacity-90"
            >
              {loading ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 8 }, (_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="border-border bg-secondary text-foreground"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full rose-gradient py-5 font-semibold text-primary-foreground hover:opacity-90"
            >
              {loading ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              {t('auth.verify')}
            </Button>

            <div className="flex flex-col items-center gap-2">
              {resendTimer > 0 ? (
                <p className="text-sm text-muted-foreground">{t('auth.resendIn')} {resendTimer}s</p>
              ) : (
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {t('auth.resend')}
                </button>
              )}
              <button
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                  if (timerRef.current) clearInterval(timerRef.current);
                  setResendTimer(0);
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t('auth.changeEmail')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
