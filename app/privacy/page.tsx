import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Fourplay Picks",
  description: "Privacy policy for Fourplay Picks",
}

export const dynamic = "force-dynamic"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">
            Privacy Policy
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Last updated: May 31, 2026
          </p>
        </div>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <p>
              Fourplay Picks (&ldquo;Fourplay,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy.
              This Privacy Policy explains what information we collect when you use the
              Fourplay app and website, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Information We Collect
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <span className="text-white font-semibold">Email address</span> — used to
                create and authenticate your account.
              </li>
              <li>
                <span className="text-white font-semibold">Username</span> — your chosen
                display name, visible to other members of leagues you join.
              </li>
              <li>
                <span className="text-white font-semibold">Profile photo</span> — optional,
                visible to other members of leagues you join.
              </li>
              <li>
                <span className="text-white font-semibold">Gameplay data</span> — the picks
                you make, your league memberships, win/loss records, and scoring history.
              </li>
            </ul>
            <p className="mt-3">
              We do not collect payment information, location data, contacts, or device
              identifiers beyond what is necessary to keep you signed in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To authenticate you and keep your account secure.</li>
              <li>To run the gameplay features — recording your picks, scoring them against final game results, and displaying league standings.</li>
              <li>To display your username and profile photo to other members of leagues you have joined.</li>
              <li>To respond to support requests you send us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              How Your Information Is Stored
            </h2>
            <p>
              Your account and gameplay data are stored using Supabase, our backend
              infrastructure provider. Authentication tokens are stored on your device so
              you stay signed in between sessions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Sharing
            </h2>
            <p>
              We do not sell your personal information, and we do not share it with
              advertisers or marketing partners. The only third party that processes your
              data on our behalf is Supabase, which hosts our database and authentication
              service. Game odds and final scores are obtained from a third-party sports
              data provider and contain no information about you.
            </p>
            <p className="mt-3">
              Your username, profile photo, picks, and league standings are visible to
              other members of leagues you choose to join.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Your Choices
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You can update your username and profile photo at any time in the app&apos;s profile settings.</li>
              <li>You can leave any league you have joined.</li>
              <li>You can request deletion of your account and all associated data by emailing us at the address below.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Children&apos;s Privacy
            </h2>
            <p>
              Fourplay is not directed to children under 13, and we do not knowingly collect
              personal information from anyone under 13. If you believe a child has provided
              us with personal information, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will
              update the &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or want to request deletion
              of your data, email us at{" "}
              <a
                href="mailto:michaellyonshow@gmail.com"
                className="text-green-500 font-bold hover:underline"
              >
                michaellyonshow@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
