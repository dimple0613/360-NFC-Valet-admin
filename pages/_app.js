import Head from "next/head";
import "../styles/globals.css";
import { ToastProvider } from "@/components/Toast";

function MyApp({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  );
}

export default MyApp;
