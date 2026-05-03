import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/404");
  }, [router]);

  return null;
}