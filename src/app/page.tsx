import Link from "next/link";
import type { Metadata } from "next";
import "./home.css";

export const metadata: Metadata = {
  title: "Postroom — Email campaigns on your SMTP",
  description:
    "Build a list, write the campaign, and track opens and clicks. Postroom sends through the mail server you already use.",
};

function Logo() {
  return (
    <Link href="/" className="mc-logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#241C15" />
        <path d="M7 12h18v11H7z" fill="none" stroke="#FFE01B" strokeWidth="1.8" />
        <path d="M7 12.5 16 19l9-6.5" fill="none" stroke="#FFE01B" strokeWidth="1.8" />
      </svg>
      Postroom
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="home">
      <div className="mc-yellow">
        <header className="mc-nav-wrap">
        <div className="mc-nav">
          <Logo />
          <nav className="mc-nav-links" aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#send">Sending</a>
            <Link href="/login">Log in</Link>
            <Link className="mc-btn" href="/signup">
              Sign up
            </Link>
          </nav>
          <div className="mc-nav-tools">
            <Link className="mc-btn mc-signup-mobile" href="/signup">
              Sign up
            </Link>
            <details className="mc-menu">
              <summary>Menu</summary>
              <nav aria-label="Mobile">
                <a href="#product">Product</a>
                <a href="#pricing">Pricing</a>
                <a href="#send">Sending</a>
                <Link href="/login">Log in</Link>
              </nav>
            </details>
          </div>
        </div>
        </header>

        <section className="mc-hero">
          <div>
            <p className="mc-kicker">Email campaigns</p>
            <h1>Turn a list into a letter.</h1>
            <p className="mc-lede">
              Postroom keeps the people, the draft, and the record of who opened it. Your own SMTP server delivers the mail.
            </p>
            <div className="mc-hero-actions">
              <Link className="mc-btn" href="/signup">
                Sign up free
              </Link>
              <Link className="mc-btn mc-btn-ghost" href="/login">
                Log in
              </Link>
            </div>
          </div>
          <div className="mc-stage" aria-hidden="true">
            <div className="mc-blob mc-blob-a" />
            <div className="mc-blob mc-blob-b" />
            <div className="mc-stamp">
              Air
              <br />
              mail
            </div>
            <div className="mc-window">
              <div className="mc-window-bar">
                <span className="mc-dot" />
                <span className="mc-dot" />
                <span className="mc-dot" />
                <span style={{ marginLeft: 8 }}>Spring letter · Draft</span>
              </div>
              <div className="mc-window-body">
                <div className="mc-side">
                  <span className="on">Campaigns</span>
                  <span>Lists</span>
                  <span>Templates</span>
                </div>
                <div className="mc-letter">
                  <small>To Readers · 128 subscribed</small>
                  <strong>The spring letter</strong>
                  <div className="mc-paper">
                    <b>Hi Alex,</b>
                    One short note, a single link, and the address on the footer. Preview it before it goes anywhere.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mc-features" id="product">
        <div className="mc-section">
          <h2>What you can do from day one.</h2>
          <p className="mc-sub">Four jobs, in the order a campaign actually happens.</p>
          <div className="mc-cards">
            <article className="mc-card mc-card-yellow">
              <p className="mc-kicker">01</p>
              <h3>Build the list</h3>
              <ul>
                <li>Add people one by one or import a CSV.</li>
                <li>Put the same person on more than one list.</li>
                <li>Someone who unsubscribed stays unsubscribed.</li>
              </ul>
              <Link href="/signup">Start a list</Link>
            </article>
            <article className="mc-card mc-card-pink">
              <p className="mc-kicker">02</p>
              <h3>Write the letter</h3>
              <ul>
                <li>Start from an announcement or a newsletter.</li>
                <li>Drop in a name with a merge tag.</li>
                <li>Read the preview before you queue it.</li>
              </ul>
              <Link href="/signup">Open the editor</Link>
            </article>
            <article className="mc-card mc-card-mint">
              <p className="mc-kicker">03</p>
              <h3>See what happened</h3>
              <ul>
                <li>Opens and clicks land on the campaign.</li>
                <li>Failures are listed with the reason.</li>
                <li>Every letter has a one-click unsubscribe.</li>
              </ul>
              <Link href="/signup">See a campaign</Link>
            </article>
            <article className="mc-card mc-card-ink">
              <p className="mc-kicker">04</p>
              <h3>Send it your way</h3>
              <ul>
                <li>Amazon SES, Mailgun, Postmark, or any SMTP.</li>
                <li>No host yet? Letters are stored here so you can try the flow.</li>
                <li>Your company name and postal address go on the footer.</li>
              </ul>
              <Link href="/signup">Connect SMTP later</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="mc-band">
        <div className="mc-section">
          <h2>A mailroom, not a shared IP.</h2>
          <p className="mc-sub">Deliverability stays with the provider you already trust. Postroom does the list, the creative, and the queue.</p>
          <div className="mc-facts">
            <article>
              <h3>Your list</h3>
              <p>Contacts live in your Postroom database. Export them whenever you want.</p>
            </article>
            <article>
              <h3>Your letter</h3>
              <p>Templates, a subject line, and merge tags. The draft stays editable until you send.</p>
            </article>
            <article>
              <h3>Your server</h3>
              <p>The worker hands each message to your SMTP account, one person at a time.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mc-plan-wrap" id="pricing">
        <div className="mc-section">
          <div className="mc-plan">
            <div>
              <p className="mc-kicker">Start here</p>
              <h2>Try a full send before you pay a mail provider.</h2>
              <p className="mc-lede">
                With no SMTP host saved, Postroom stores each letter on the campaign. Click the links. Hit unsubscribe. Then add credentials when you are ready for real inboxes.
              </p>
              <div className="mc-hero-actions">
                <Link className="mc-btn" href="/signup">
                  Create an account
                </Link>
              </div>
            </div>
            <ul className="mc-checks">
              <li><span className="mc-tick" /> Lists, CSV import, and templates</li>
              <li><span className="mc-tick" /> Campaign drafts and a review step</li>
              <li><span className="mc-tick" /> Open tracking and signed click tracking</li>
              <li><span className="mc-tick" /> Unsubscribe link and postal address on every letter</li>
              <li><span className="mc-tick" /> Pause a send that is already in progress</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mc-apps" id="send">
        <div className="mc-section">
          <h2>One queue. Any mail server.</h2>
          <p className="mc-sub">Postroom speaks SMTP. If your provider gives you a host, a port, and a password, you can send.</p>
          <div className="mc-pills">
            <span>Amazon SES</span>
            <span>Mailgun</span>
            <span>Postmark</span>
            <span>Any SMTP</span>
          </div>
        </div>
      </section>

      <footer className="mc-foot">
        <div className="mc-foot-grid">
          <div>
            <Logo />
            <p>Campaign email for people who already have a way to send it.</p>
          </div>
          <div>
            <h2>Product</h2>
            <a href="#product">Lists and letters</a>
            <a href="#pricing">Start free</a>
            <a href="#send">SMTP</a>
          </div>
          <div>
            <h2>Account</h2>
            <Link href="/signup">Sign up</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
        <p className="mc-legal">You bring permission to email the list, and you bring the mail server.</p>
      </footer>
    </div>
  );
}
