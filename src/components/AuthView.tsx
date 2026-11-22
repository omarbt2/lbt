import React, { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LbtLogo from './LbtLogo';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import './AuthView.css';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const pendingVerification = useAuthStore((state) => state.pendingVerification);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);

  const [screen, setScreen] = useState<'login' | 'signup' | 'reset' | 'update-password'>(() => new URLSearchParams(window.location.search).get('mode') === 'recovery' ? 'update-password' : 'login');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [pwdStrength, setPwdStrength] = useState(1);

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setErrorNotice(null);
        setAuthNotice(null);
        setScreen('update-password');
      }
    });
    if (new URLSearchParams(window.location.search).get('mode') === 'recovery') {
      setScreen('update-password');
    }
    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChange = (val: string) => {
    setSignUpPassword(val);
    let str = 1;
    if (val.length > 4) str = 2;
    if (val.length > 7) str = 3;
    if (val.length > 9 && /[A-Z]/.test(val) && /[0-9]/.test(val)) str = 4;
    setPwdStrength(str);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setAuthNotice(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      setErrorNotice(null);
      if (signUpPassword !== signUpConfirmPassword) {
        setErrorNotice("Passwords don't match!");
        return;
      }
      setIsSubmitting(true);
      try {
        await signup(signUpEmail, signUpPassword, username.toLowerCase(), fullName);
        onLoginSuccess();
      } catch (err: any) {
        if ((err as any)?.code === 'VERIFY_EMAIL' || err?.message === 'VERIFY_EMAIL') {
          return;
        }
        setErrorNotice(err?.message || 'Sign up failed.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setAuthNotice(null);
    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth?mode=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo });
      if (error) throw error;
      setAuthNotice('Password reset email sent. Open the link in that email to choose a new password.');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to send the password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setAuthNotice(null);
    if (newPassword.length < 8) {
      setErrorNotice('Your new password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorNotice("The passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setNewPassword('');
      setConfirmNewPassword('');
      setPassword('');
      setScreen('login');
      setAuthNotice('Your password has been updated. Sign in with your new password.');
      window.history.replaceState({}, document.title, '/auth');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Could not update your password. Please request a new reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen bg-surface-container-low font-sans text-on-surface flex flex-col items-center justify-center p-6">
        <main className="w-full max-w-md z-10 text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Check your inbox</h1>
          <p className="text-sm text-on-surface-variant max-w-sm">
            We sent a verification link to{' '}
            <span className="font-bold text-primary">{pendingEmail}</span>.
            Click the link to activate your account, then come back and sign in.
          </p>
          <div className="flex items-center gap-2 bg-surface-container rounded-2xl px-4 py-3 border border-outline-variant/30 w-full">
            <CheckCircle className="w-5 h-5 text-on-surface shrink-0" />
            <p className="text-xs text-on-surface-variant text-left">
              Didn't get it? Check spam or try signing up again with the same email.
            </p>
          </div>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-sm text-primary underline"
          >
            Back to Sign In
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="lbt-auth-page min-h-screen bg-surface-container-low font-sans text-on-surface flex flex-col items-center justify-center p-6 bg-radial-gradient from-primary/10 to-transparent">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-surface-container-low rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md z-10">
        
        <div className="text-center mb-8 flex flex-col items-center gap-2">
          <LbtLogo size="lg" />
          <h1 className="text-3xl font-extrabold tracking-tighter text-primary">LBT</h1>
          <p className="text-xs text-outline font-semibold tracking-widest uppercase">Connect · Create · Collaborate</p>
        </div>

        <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="lbt-auth-card"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Welcome Back</h2>
              <p className="text-xs text-on-surface-variant mt-1">Sign in to your LBT account.</p>
            </div>

            {authNotice && (
              <div className="mb-5 bg-primary/10 text-primary border border-primary/20 rounded-xl p-3 text-xs font-semibold flex items-center justify-between">
                <span>{authNotice}</span>
                <button type="button" onClick={() => setAuthNotice(null)} className="text-[10px] font-bold hover:underline opacity-80 self-center pl-2">Dismiss</button>
              </div>
            )}

            <AnimatePresence>
            {errorNotice && (
              <motion.div
                key="error-login"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5 bg-error/10 text-error border border-error/20 rounded-xl p-3 text-xs font-semibold flex items-center justify-between overflow-hidden"
              >
                <span>{errorNotice}</span>
                <button type="button" onClick={() => setErrorNotice(null)} className="text-[10px] font-bold hover:underline opacity-80 self-center pl-2 text-error">Dismiss</button>
              </motion.div>
            )}
            </AnimatePresence>

            <form onSubmit={handleLoginSubmit} className="lbt-auth-form">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant block pl-1" htmlFor="login_email">
                  Email Address
                </label>
                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl flex items-center px-3.5 py-2.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Mail className="w-4.5 h-4.5 text-outline mr-2" />
                  <input
                    id="login_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border-none outline-none text-xs p-0 text-on-surface placeholder:text-outline focus:ring-0"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant block pl-1" htmlFor="login_password">Password</label>
                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl flex items-center px-3.5 py-2.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Lock className="w-4.5 h-4.5 text-outline mr-2" />
                  <input
                    id="login_password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent border-none outline-none text-xs p-0 text-on-surface placeholder:text-outline focus:ring-0"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-outline hover:text-on-surface transition-colors ml-2"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="lbt-auth-login-button" id="loginBtn"
              >
                {isSubmitting ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setResetEmail(email); setErrorNotice(null); setAuthNotice(null); setScreen('reset'); }}
              className="lbt-auth-forgot"
              id="forgotPassword"
            >
              Forgotten password?
            </button>

            <div className="lbt-auth-divider" />
            <button
              type="button"
              id="createAccountBtn"
              className="lbt-auth-create-button"
              onClick={() => {
                setErrorNotice(null);
                setAuthNotice(null);
                setScreen('signup');
                setStep(1);
              }}
            >
              Create new account
            </button>
          </motion.div>
        )}

        {screen === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-surface-container-lowest/75 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
          >
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-primary">Step {step} of 2</span>
                <span className="text-on-surface-variant">{step === 1 ? 'Profile Details' : 'Password Setup'}</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 shadow-sm"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </div>
            </div>

            <AnimatePresence>
            {errorNotice && (
              <motion.div
                key="error-signup"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5 bg-error/10 text-error border border-error/20 rounded-xl p-3 text-xs font-semibold flex items-center justify-between overflow-hidden"
              >
                <span>{errorNotice}</span>
                <button type="button" onClick={() => setErrorNotice(null)} className="text-[10px] font-bold hover:underline opacity-80 self-center pl-2 text-error">Dismiss</button>
              </motion.div>
            )}
            </AnimatePresence>

            <form onSubmit={handleSignUpSubmit} className="lbt-auth-form">
              {step === 1 ? (
                <>
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-on-surface">Create Your Account</h2>
                    <p className="text-xs text-on-surface-variant mt-1">Join the LBT community.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface" htmlFor="signup_fullname">Full Name</label>
                    <input
                      id="signup_fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface" htmlFor="signup_username">Username</label>
                    <div className="relative flex items-center">
                      <input
                        id="signup_username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="janedoe"
                        className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-3.5 pr-10 py-2.5 text-xs outline-none focus:border-primary shadow-sm"
                      />
                      {username && (
                        <CheckCircle className="w-4 h-4 text-on-surface absolute right-3 shrink-0" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface" htmlFor="signup_email">Email Address</label>
                    <input
                      id="signup_email"
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="lbt-auth-login-button"
                  >
                    {isSubmitting ? 'Processing...' : <>Continue <ArrowRight className="w-4.5 h-4.5" /></>}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)}
                      className="text-xs text-primary font-bold hover:underline mb-2 flex items-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Step 1
                    </button>
                    <h2 className="text-xl font-bold text-on-surface">Secure Password</h2>
                    <p className="text-xs text-on-surface-variant mt-1">Construct a robust keyword to protect your designs.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface block pl-1" htmlFor="signup_password">
                      Create Password
                    </label>
                    <input
                      id="signup_password"
                      type="password"
                      required
                      value={signUpPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary shadow-sm"
                      placeholder="••••••••"
                    />
                    
                    <div className="flex gap-1 mt-1.5 px-0.5">
                      <div className={`h-1.5 flex-1 rounded-full ${pwdStrength >= 1 ? 'bg-error' : 'bg-surface-container'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${pwdStrength >= 2 ? 'bg-on-surface-variant' : 'bg-surface-container'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${pwdStrength >= 3 ? 'bg-primary' : 'bg-surface-container'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${pwdStrength >= 4 ? 'bg-on-surface' : 'bg-surface-container'}`} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface block pl-1" htmlFor="signup_confirm_password">
                      Confirm Password
                    </label>
                    <input
                      id="signup_confirm_password"
                      type="password"
                      required
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="lbt-auth-create-button"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create new account'}
                  </button>
                </>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-on-surface-variant font-medium">
                Already have an account?{' '}
                <button
                  onClick={() => setScreen('login')}
                  className="font-bold text-primary hover:underline ml-0.5"
                >
                  Sign In
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {screen === 'reset' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-surface-container-lowest/75 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
          >
            <button 
              onClick={() => setScreen('login')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-on-surface">Reset Password</h2>
              <p className="text-xs text-on-surface-variant mt-1">Enter the email address linked to your LBT account. We'll send you a secure reset link.</p>
            </div>

            <AnimatePresence>
            {errorNotice && (
              <motion.div
                key="error-reset"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5 bg-error/10 text-error border border-error/20 rounded-xl p-3 text-xs font-semibold flex items-center justify-between overflow-hidden"
              >
                <span>{errorNotice}</span>
                <button type="button" onClick={() => setErrorNotice(null)} className="text-[10px] font-bold hover:underline opacity-80 self-center pl-2 text-error">Dismiss</button>
              </motion.div>
            )}
            </AnimatePresence>

            <form onSubmit={handleResetSubmit} className="lbt-auth-form">
              {authNotice && <div className="lbt-auth-success" role="status">{authNotice}</div>}
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface" htmlFor="reset_email">Email Address</label>
                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl flex items-center px-3.5 py-2.5 shadow-sm">
                  <Mail className="w-4.5 h-4.5 text-outline mr-2" />
                  <input
                    id="reset_email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs p-0 text-on-surface placeholder:text-outline focus:ring-0"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="lbt-auth-login-button"
              >
                {isSubmitting ? 'Searching...' : 'Send reset link'}
              </button>
            </form>
          </motion.div>
        )}

        {screen === 'update-password' && (
          <motion.div
            key="update-password"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="lbt-auth-card"
          >
            <button
              type="button"
              onClick={() => setScreen('login')}
              className="lbt-auth-back-link"
            >
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-on-surface">Choose a new password</h2>
              <p className="text-xs text-on-surface-variant mt-1">Use at least 8 characters to secure your LBT account.</p>
            </div>
            {errorNotice && <div className="lbt-auth-error" role="alert">{errorNotice}</div>}
            <form onSubmit={handleUpdatePassword} className="lbt-auth-form">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="lbt-auth-input"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                className="lbt-auth-input"
              />
              <button type="submit" disabled={isSubmitting} className="lbt-auth-login-button">
                {isSubmitting ? 'Updating...' : 'Save new password'}
              </button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
