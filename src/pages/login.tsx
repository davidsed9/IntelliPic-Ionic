import React, { useEffect, useState } from "react";

import { useUser } from "@supabase/auth-helpers-react";
import Router from "next/router";
import { supabase } from "@/supabaseClient";
import classNames from "classnames";

import styles from "./Home.module.css";
import Header from "../components/Header";

// const APP_ROOT = "https://intelli-pic.vercel.app/"; // Change this depending on where you want to be redirected after the email
const APP_ROOT = process.env.APP_ROOT; // Change this depending on where you want to be redirected after the email

export default function Login() {
  const [email, setEmail] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const user = useUser();

  useEffect(() => {
    if (user) {
      Router.push("/");
    }
  }, [user]);

  async function signInWithEmail() {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: APP_ROOT,
      },
    });

    setEmail("");
    setLoginMessage("Correo enviado");
  }

  return (
    <div>
      <Header showHeader={false} />
      <main className={classNames(styles.main, styles.loginpage)}>
        <input
          className={classNames(styles.input, styles.logininput)}
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder={"Ingrese la dirección de correo electrónico para iniciar sesión o registrarse"}
        />
        <button
          className={classNames(
            styles.button,
            styles.primary,
            styles.loginbutton,
            { [styles.inactive]: email.length === 0 }
          )}
          onClick={signInWithEmail}
          disabled={email.length === 0}
        >
          Iniciar sesión / Registrarse
        </button>
        <div className={styles.loginmessage}>{loginMessage.length > 0 && loginMessage}</div>
      </main>
    </div>
  );
}
