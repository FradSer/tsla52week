import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface PriceData {
  high: number;
  low: number;
}

export default function Home() {
  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const [priceData, setPriceData] = useState<PriceData | null>(null);

  useEffect(() => {
    if (!debug) {
      const fetchPriceData = async () => {
        try {
          const response = await fetch("/api/tsla-price");
          if (!response.ok) {
            console.error("Failed to fetch price data");
            return; // Ensure it doesn't proceed if response is not OK
          }
          const data = await response.json();
          setPriceData(data);
        } catch (error) {
          console.error("Error fetching price data:", error);
        }
      };

      // Handle the returned Promise to avoid the warning
      const fetchData = fetchPriceData();
      return () => {
        fetchData.then(() => {
          console.log("Clean-up or finalize if necessary.");
        });
      };
    }
  }, [debug]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="relative w-full max-w-4xl">
        {/* Container with aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="/bg.png"
              alt="Background"
              objectFit="contain"
              width="1540"
              height="1540"
            />
          </div>

          {/* Overlay text */}
          {(debug || priceData) && (
            <div className="absolute text-bold text-black top-1/4 left-1/2 transform -translate-x-[5.5%] -translate-y-[35%] flex space-x-[3.9rem] md:space-x-[5.3rem] sm:space-x-[4.9rem]">
              {/* High Price */}
              <div className="text-center">
                <div style={{ fontSize: "min(1.8rem, calc(3vw))" }}>
                  <div>$TSLA</div>
                  <div>52 week high</div>
                  <div className="mt-4">
                    @{debug ? (358.64).toFixed(2) : priceData?.high.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Low Price */}
              <div className="text-center">
                <div style={{ fontSize: "min(1.8rem, calc(3vw))" }}>
                  <div>$TSLA</div>
                  <div>52 week low</div>
                  <div className="mt-4">
                    @{debug ? (138.8).toFixed(2) : priceData?.low.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute text-bold text-black bottom-0 flex items-center justify-center w-full">
          Made with FOMO by&nbsp;
          <Link href="https://frad.me">
            <u>Frad</u>
          </Link>
        </div>
      </div>
    </div>
  );
}
