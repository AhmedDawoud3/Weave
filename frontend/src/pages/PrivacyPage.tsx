import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, FileText } from 'lucide-react';
import { useEffect } from 'react';

export function PrivacyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Weave | Privacy Policy";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto selection:bg-primary/30 selection:text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="group mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Home
        </button>

        {/* Header */}
        <div className="border-b border-border pb-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Shield size={32} />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm text-muted-foreground/80">
            Last Updated: July 7, 2026
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-10">
          {/* Introduction */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <FileText size={20} className="text-primary" />
              <h2>1. Introduction</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Welcome to <strong>Weave</strong> ("we," "our," or "us"). Weave is a collaborative platform designed to help machine learning engineers, data scientists, and developers design, compile, and train neural network architectures. 
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Your privacy is of paramount importance to us. This Privacy Policy details how we collect, use, protect, and handle your personal data when you use our platform, including our sign-in integrations with third-party OAuth providers such as Google and Facebook.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <Eye size={20} className="text-primary" />
              <h2>2. Information We Collect</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              We collect information to provide a better user experience and facilitate authentication, workspace loading, and model compilation.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div className="p-5 rounded-2xl bg-background-alt border border-border space-y-2">
                <h3 className="text-foreground font-medium">Account & Profile Information</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Email address (for account verification and identity)</li>
                  <li>Display name (to label your workspace and projects)</li>
                  <li>Profile picture URL (optional, imported via OAuth)</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-background-alt border border-border space-y-2">
                <h3 className="text-foreground font-medium">Workspace & Project Data</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Network graph topologies (node structures and parameters)</li>
                  <li>Dataset configurations, custom loaders, and transforms</li>
                  <li>Training session metrics, logs, and loss/scheduler configurations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <Database size={20} className="text-primary" />
              <h2>3. How We Use Your Information</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Weave uses the collected data for the following specific purposes:
            </p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-2">
              <li><strong>User Authentication:</strong> To allow you to register, log in, and secure your account using traditional credentials or social logins (Google, Facebook).</li>
              <li><strong>Project Management:</strong> To save, load, and restore your design canvas configurations and custom hyperparameters.</li>
              <li><strong>Model Training & Compilation:</strong> To compile Weave graphs into PyTorch code and feed training progress, metrics, and logs back to your browser console in real-time.</li>
              <li><strong>Service Improvement:</strong> To monitor application status, logs, and tracebacks to solve dimension mismatch and compiler bugs.</li>
            </ul>
          </section>

          {/* OAuth Providers */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <Lock size={20} className="text-primary" />
              <h2>4. OAuth Authentication Providers (Google & Facebook)</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Weave supports signing in using your Google and Facebook accounts. By choosing to log in via OAuth:
            </p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-2">
              <li>We receive only the profile scopes explicitly consented to (specifically your email, public display name, and profile picture).</li>
              <li>We <strong>never</strong> request, store, or receive your social account passwords.</li>
              <li>Your OAuth access tokens are handled securely on your browser client-side, and are only validated by our backend server by calling the respective provider's verified APIs (Google UserInfo API or Facebook Graph API) during the login request.</li>
              <li>You can revoke Weave's access to your Google or Facebook account at any time via your provider's security portal.</li>
            </ul>
          </section>

          {/* Data Storage & Security */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <Shield size={20} className="text-primary" />
              <h2>5. Data Storage and Security</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              We implement industry-standard security measures to safeguard your information:
            </p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-2">
              <li>User passwords are hashed using salt-hashed industry-standard algorithms (PBKDF2/BCrypt) via ASP.NET Core Identity.</li>
              <li>All database and real-time network communications (SSE, REST APIs) are encrypted using Transport Layer Security (TLS/HTTPS).</li>
              <li>We do not sell, trade, or distribute your personal profile information or proprietary machine learning architectures to third parties.</li>
            </ul>
          </section>

          {/* User Rights */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xl">
              <Database size={20} className="text-primary" />
              <h2>6. Your Rights & Data Deletion</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              You hold complete ownership over your data. Under applicable privacy laws (such as GDPR and CCPA), you have the right to:
            </p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-2">
              <li>Access, export, or download your saved Weave graph architectures.</li>
              <li>Update or correct your account display name or email address.</li>
              <li>Request the complete deletion of your account and all associated project training histories from our database.</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              To request account deletion or if you have any privacy questions, please contact our administrator at <a href="mailto:support@weave-ai.dev" className="text-primary hover:underline">support@weave-ai.dev</a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-16 pt-8 text-center text-sm text-muted-foreground/75">
          <p>© {new Date().getFullYear()} Weave. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
