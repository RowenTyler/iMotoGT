"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/ui/header";
import { useUser } from "@/components/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
} from "lucide-react";
import { SOCIAL_LINKS, CONTACT_INFO } from "@/lib/social-config";

export default function ClientPage() {
  const { authUser, isLoading } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!authUser) return;
    const fullName = [authUser.firstName, authUser.lastName]
      .filter(Boolean)
      .join(" ");
    setName((prev) => prev || fullName);
    setEmail((prev) => prev || authUser.email || "");
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setSending(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setStatus("success");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const neutralCardClass =
    "rounded-3xl border border-[#9FA791]/20 dark:border-[#4A4D45]/20 bg-white dark:bg-[#2A352A] shadow-md p-6";

  const detailsCardClass =
    "rounded-3xl border border-[#3E5641]/30 dark:border-[#3E5641]/20 bg-[#3E5641] dark:bg-[#1F2B20] shadow-md p-5 text-white";

  return (
    <div className="h-dvh bg-[#FFF8E0] dark:bg-[#1F2B20] flex flex-col">
      <Header />

      <main className="flex-1 pt-28 pb-8 px-4 min-h-0">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="text-center mb-5 shrink-0">
            <h1 className="text-4xl font-bold text-[#3E5641] dark:text-white">
              Contact Us
            </h1>
            <div className="w-20 h-1 bg-[#FF6700] mt-2 mx-auto" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
            {/* LEFT – Contact Form */}
            <div className="lg:col-span-2 h-full">
              <div className={neutralCardClass + " h-full flex flex-col"}>
                <div className="flex-1 overflow-y-auto pr-1">
                  {!authUser && !isLoading ? (
                    /* Not logged-in – centered content that fills the card */
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <h2 className="text-xl font-semibold text-[#3E5641] dark:text-white mb-4">
                        Log in to send us a message directly
                      </h2>
                      <div className="w-full flex justify-center">
                        <Link href="/login?redirect=/contact">
                          <Button className="bg-[#FF6700] hover:bg-[#FF6700]/90 text-white w-full sm:w-auto">
                            Log In / Sign Up
                          </Button>
                        </Link>
                      </div>
                      <div className="relative my-5 w-full max-w-xs">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-[#9FA791]/30 dark:border-[#4A4D45]/30" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-[#2A352A] px-2 text-[#6F7F69] dark:text-gray-400">
                            or send us an email at
                          </span>
                        </div>
                      </div>
                      <a
                        href={`mailto:${CONTACT_INFO.email ?? "supportadmin@imotogt.co.za"}`}
                        className="text-[#FF6700] hover:underline font-medium"
                      >
                        {CONTACT_INFO.email ?? "supportadmin@imotogt.co.za"}
                      </a>
                    </div>
                  ) : (
                    /* Logged in – form */
                    <>
                      <h2 className="text-xl font-semibold text-[#3E5641] dark:text-white mb-5">
                        Send a Message
                      </h2>
                      {status === "success" && (
                        <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Message sent! We’ll get back to you soon.
                        </div>
                      )}
                      {status === "error" && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                            />
                          </svg>
                          {errorMsg}
                        </div>
                      )}
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#3E5641] dark:text-gray-300 mb-1">
                            Your Name
                          </label>
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter your name"
                            className="rounded-xl border-[#9FA791]/30 dark:border-[#4A4D45]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#3E5641] dark:text-gray-300 mb-1">
                            Your Email
                          </label>
                          <Input
                            value={email}
                            readOnly
                            className="rounded-xl bg-gray-100 dark:bg-gray-700 border-[#9FA791]/30 dark:border-[#4A4D45]/30 cursor-not-allowed"
                          />
                          <p className="text-xs text-[#6F7F69] dark:text-gray-400 mt-1">
                            Email is linked to your account
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#3E5641] dark:text-gray-300 mb-1">
                            Subject{" "}
                            <span className="text-[#6F7F69] dark:text-gray-400">
                              (optional)
                            </span>
                          </label>
                          <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="What is this regarding?"
                            className="rounded-xl border-[#9FA791]/30 dark:border-[#4A4D45]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#3E5641] dark:text-gray-300 mb-1">
                            Message
                          </label>
                          <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            placeholder="Write your message here..."
                            className="min-h-[120px] rounded-xl border-[#9FA791]/30 dark:border-[#4A4D45]/30"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={sending}
                          className="w-full bg-[#FF6700] hover:bg-[#FF6700]/90 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                          {sending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT – Details + Map */}
            <div className="lg:col-span-1 flex flex-col gap-5 min-h-0 h-full">
              <div className={detailsCardClass + " shrink-0"}>
                <div className="flex justify-center mb-2">
                  <Image
                    src="/imoto-icon-new.png"
                    alt="iMoto GT"
                    width={200}
                    height={60}
                    className="object-contain brightness-0 invert"
                    priority
                  />
                </div>
                <p className="text-sm text-center text-white/70 mt-1">
                  South Africa&apos;s trusted vehicle marketplace.
                </p>
                <hr className="my-4 border-white/20" />

                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-white/70 shrink-0" />
                  <a
                    href={`mailto:${CONTACT_INFO.email ?? "supportadmin@imotogt.co.za"}`}
                    className="text-[#FF6700] hover:underline text-sm"
                  >
                    {CONTACT_INFO.email ?? "supportadmin@imotogt.co.za"}
                  </a>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4 text-white/70 shrink-0" />
                  <span className="text-sm text-white/50">
                    {CONTACT_INFO.phone || "Coming soon"}
                  </span>
                </div>

                <hr className="my-4 border-white/20" />

                <h3 className="text-sm font-semibold text-white mb-3">
                  Find us on social media
                </h3>
                <div className="flex items-center gap-4">
                  {SOCIAL_LINKS.facebook?.trim() && (
                    <a
                      href={SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="text-white/70 hover:text-[#FF6700] transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {SOCIAL_LINKS.instagram?.trim() && (
                    <a
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="text-white/70 hover:text-[#FF6700] transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {SOCIAL_LINKS.twitter?.trim() && (
                    <a
                      href={SOCIAL_LINKS.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Twitter / X"
                      className="text-white/70 hover:text-[#FF6700] transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {SOCIAL_LINKS.tiktok?.trim() && (
                    <a
                      href={SOCIAL_LINKS.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="text-white/70 hover:text-[#FF6700] transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 min-h-0 rounded-3xl overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14961733.773372563!2d24.6727!3d-28.4793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9514a2db4e4d6f%3A0x1e91a8fda3163d20!2sSouth%20Africa!5e0!3m2!1sen!2sza!4v1680000000000"
                  className="w-full h-full"
                  loading="lazy"
                  title="South Africa map"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}