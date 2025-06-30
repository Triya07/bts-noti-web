import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function App() {
  const [nickname, setNickname] = useState("");
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("soundEnabled") === "true";
  });

  const socketRef = useRef(null);

  // ✅ Load nickname if already saved
  useEffect(() => {
    const stored = localStorage.getItem("nickname");
    if (stored) {
      setNickname(stored);
      setRegistered(true);
    }
  }, []);

  // ✅ Setup socket, notification, audio
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("✅ Service Worker registered", reg))
        .catch(console.error);
    }

    if (!socketRef.current) {
      const socket = io("http://localhost:3000", {
        transports: ["websocket"],
        upgrade: false
      });

      socketRef.current = socket;

      socket.on("show-notification", () => {
        setIsLive(true);

        if (Notification.permission === "granted") {
          new Notification("BTS is LIVE", {
            body: "A member just went live on Weverse",
            icon: "/purple-heart1.png",
          });
        }

        if (soundEnabled) {
          const audio = new Audio("/ugh1.mp3");
          audio.volume = 0.8;
          audio.play().catch(console.warn);
        }

        setTimeout(() => setIsLive(false), 10000);
      });

      socket.on("update-user-count", (count) => {
        setUserCount(count);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [soundEnabled]);

  // ✅ Register nickname
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      const res = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("nickname", nickname);
        setRegistered(true);
        subscribeUser();
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("❌ Server error:", err);
      setError("Server not responding.");
    }
  };

  // ✅ Subscribe for push notifications
  const subscribeUser = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BLEuZFY064dYuBtZzErjsHJ30Vf15_Tw5v2nYuOYBjMyqes7bm-BYaN75eLLBOHS6HaSUJsEqXxSSiGD7hPrzRA"
      ),
    });
    await fetch("http://localhost:3000/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: { "Content-Type": "application/json" },
    });
  };

  // ✅ Emit live alert
  const notifyLive = () => {
    if (socketRef.current) {
      socketRef.current.emit("bts-live");
    }
  };

  // ✅ Enable sound preview (5 sec)
  const handleEnableSound = () => {
    const audio = new Audio("/ugh1.mp3");
    audio.volume = 0.5;

    audio.play()
      .then(() => {
        localStorage.setItem("soundEnabled", "true");
        setSoundEnabled(true);
        alert("✅ Sound alerts are now enabled! You'll hear UGH when BTS is live.");

        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
        }, 5000);
      })
      .catch((err) => {
        alert("❌ Please allow sound manually. Click again if blocked.");
        console.warn("Audio play blocked:", err);
      });
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "40px" }}>
      {!registered ? (
        <form onSubmit={handleSubmit}>
          <label>
            Enter your ARMY nickname:
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. bts_army"
            />
          </label>
          <button type="submit">Set Nickname</button>
          {error && <p style={{ color: "red" }}>{error}</p>}

          {!soundEnabled && (
            <div style={{ marginTop: "20px" }}>
              <button
                className="enable-sound-btn"
                onClick={handleEnableSound}
                title="Recommended to hear live alerts"
                type="button"
              >
                🔊 Enable Sound Alerts
              </button>
              <p style={{ fontSize: "14px", color: "#666" }}>
                Recommended to hear a sound when BTS goes live!
              </p>
            </div>
          )}
        </form>
      ) : (
        <>
          <div className="top-banner">
            <h2 className="heading">Welcome, {nickname}! 💜</h2>
          </div>

          {isLive && <h3 className="live-alert">BTS is LIVE! </h3>}

          <p className="user-count">
            👥 {userCount} ARMYs are online right now
          </p>

          <img
            src="purple-heart1.png"
            alt="Notify ARMYs"
            onClick={notifyLive}
            className="heart-button"
          />
          <p className="live-message">Notify BTS is LIVE</p>

          {!soundEnabled && (
            <div style={{ marginTop: "20px" }}>
              <button
                className="enable-sound-btn"
                onClick={handleEnableSound}
                title="Recommended to hear live alerts"
                type="button"
              >
                🔊 Enable Sound Alerts
              </button>
              <p style={{ fontSize: "14px", color: "#666" }}>
                Recommended to hear a sound when BTS goes live!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
