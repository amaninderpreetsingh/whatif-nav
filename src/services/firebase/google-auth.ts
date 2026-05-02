import { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "./config";
import { createUserProfile, getUserProfile } from "./firestore";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  "343792154194-3dbtsstn609be1tac7thkmg1p16rt430.apps.googleusercontent.com";
const IOS_CLIENT_ID =
  "343792154194-aeh4v5a2u08nc494sdihq8eq1i6e3049.apps.googleusercontent.com";

export function useGoogleSignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "error") {
      setSigningIn(false);
      setError(response.error?.message || "Sign-in cancelled");
      return;
    }

    if (response.type !== "success") {
      setSigningIn(false);
      return;
    }

    const idToken = response.params?.id_token;
    const accessToken = response.authentication?.accessToken;

    if (!idToken && !accessToken) {
      setSigningIn(false);
      setError("No credential returned from Google");
      return;
    }

    (async () => {
      try {
        const credential = GoogleAuthProvider.credential(
          idToken ?? null,
          accessToken ?? null
        );
        const result = await signInWithCredential(auth, credential);

        // Ensure a Firestore user profile exists
        const existing = await getUserProfile(result.user.uid);
        if (!existing) {
          await createUserProfile(
            result.user.uid,
            result.user.email || "",
            result.user.displayName ||
              result.user.email?.split("@")[0] ||
              "User"
          );
        }
        setSigningIn(false);
        setError(null);
      } catch (err: any) {
        setSigningIn(false);
        setError(err?.message || "Failed to complete sign-in");
      }
    })();
  }, [response]);

  const signIn = async () => {
    if (!request) return;
    setSigningIn(true);
    setError(null);
    try {
      await promptAsync();
    } catch (err: any) {
      setSigningIn(false);
      setError(err?.message || "Failed to open Google sign-in");
    }
  };

  return {
    signIn,
    ready: !!request,
    signingIn,
    error,
  };
}
