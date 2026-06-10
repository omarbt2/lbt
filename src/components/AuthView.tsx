import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LbtLogo from './LbtLogo';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const pendingVerification = useAuthStore((state) => state.pendingVerification);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);

  const [screen, setScreen] = useState<'login' | 'signup' | 'reset'>('login');
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
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      setAuthNotice('A password reset link was dispatched to your email address!');
      setScreen('login');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to trigger reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setErrorNotice(error.message);
  };

  const handleAppleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    });
    if (error) setErrorNotice(error.message);
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
    <div className="min-h-screen bg-surface-container-low font-sans text-on-surface flex flex-col items-center justify-center p-6 bg-radial-gradient from-primary/10 to-transparent">
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
            className="bg-surface-container-lowest/75 backdrop-blur-xl border border-outline-variant/30 rounded-3xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                <div className="flex justify-between items-center pl-1">
                  <label className="text-xs font-bold text-on-surface-variant" htmlFor="login_password">Password</label>
                  <button
                    type="button"
                    onClick={() => setScreen('reset')}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
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
                className="w-full bg-primary hover:bg-on-primary-fixed-variant text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-primary/20 active:translate-y-0 disabled:opacity-50 press-scale"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-outline-variant/40" />
                <span className="text-xs text-on-surface-variant">or continue with</span>
                <div className="flex-1 h-px bg-outline-variant/40" />
              </div>
              <button onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 w-full py-3 border border-outline-variant/30 rounded-2xl hover:bg-surface-container transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-on-surface">Continue with Google</span>
              </button>
              <button onClick={handleAppleLogin}
                className="flex items-center justify-center gap-3 w-full py-3 bg-on-surface rounded-2xl hover:bg-on-surface/90 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-sm font-medium text-white">Continue with Apple</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-on-surface-variant font-medium">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setScreen('signup');
                    setStep(1);
                  }}
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Sign Up
                </button>
              </p>
            </div>
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

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
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
                    className="w-full bg-primary hover:bg-on-primary-fixed-variant text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center items-center gap-1.5 mt-2 disabled:opacity-50 press-scale"
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
                    className="w-full bg-primary hover:bg-on-primary-fixed-variant text-white font-bold py-3 rounded-xl transition-all shadow-md mt-4 disabled:opacity-50 press-scale"
                  >
                    {isSubmitting ? 'Signing Up...' : 'Complete Registration'}
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
              <p className="text-xs text-on-surface-variant mt-1">Enter your registered email address below. We'll send you a password reset link instantly.</p>
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

            <form onSubmit={handleResetSubmit} className="space-y-4">
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
                className="w-full bg-primary hover:bg-on-primary-fixed-variant text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-primary/10 mt-2 disabled:opacity-50 press-scale"
              >
                {isSubmitting ? 'Sending Request...' : 'Send Reset Link'}
              </button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
