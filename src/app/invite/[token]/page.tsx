"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function InviteAcceptPage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login">("loading");
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    async function accept() {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();

      if (res.status === 401) {
        setStatus("login");
        setMessage("Connectez-vous pour accepter l'invitation");
        return;
      }

      if (res.ok) {
        setStatus("success");
        setProjectName(data.project?.name || "");
        setTimeout(() => router.push(`/project/${data.project?.id}`), 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Invitation invalide");
      }
    }
    accept();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && <span className="text-narra-muted">Acceptation de l'invitation...</span>}
        {status === "login" && (
          <>
            <p className="text-narra-muted">{message}</p>
            <Link href={`/login?returnTo=/invite/${token}`} className="btn-primary">
              Se connecter
            </Link>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-lg font-bold">Bienvenue dans {projectName} !</p>
            <p className="text-narra-muted">Redirection en cours...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-narra-danger">{message}</p>
            <Link href="/library" className="btn-ghost">Retour à la bibliothèque</Link>
          </>
        )}
      </div>
    </div>
  );
}
