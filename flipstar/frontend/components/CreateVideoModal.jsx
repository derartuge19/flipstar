import { useState, useRef } from "react";
import { useLegacyT } from "../contexts/ThemeContext";

export function CreateVideoModal({ onClose, onVideoCreated }) {
  const T = useLegacyT();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setIsVideo(file.type.startsWith('video/'));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result);
      };
      reader.readAsDataURL(file);
      setErr("");
    }
  };

  const handleUpload = async () => {
    if (!image || !caption.trim()) {
      setErr("Please select an image and add a caption");
      return;
    }

    setLoading(true);
    try {
      // Create a mock video object
      const mockVideo = {
        id: Math.floor(Math.random() * 10000),
        creator: "You",
        handle: "yourhandle",
        avatar: "👤",
        caption: caption,
        likes: 0,
        comments: 0,
        shares: 0,
        image: preview,
        liked: false,
        bookmarked: false
      };

      console.log("Video created:", mockVideo);
      
      // Call the callback with the new video
      onVideoCreated?.(mockVideo);
      
      // Close modal
      onClose();
    } catch(e) {
      console.error("Upload error:", e);
      setErr(e.message || "Failed to upload video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: 24,
        maxWidth: 500,
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a" }}>Create Video 📹</div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ✕
          </button>
        </div>

        {/* Image Preview */}
        {preview ? (
          <div style={{
            width: "100%",
            height: 300,
            borderRadius: 12,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            overflow: "hidden",
            position: "relative",
          }}>
            {isVideo ? (
              <video
                src={preview}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <button
              onClick={() => {
                setImage(null);
                setPreview(null);
                setIsVideo(false);
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.7)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              height: 300,
              borderRadius: 12,
              border: `2px dashed #ccc`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              cursor: "pointer",
              background: "#f5f5f5",
              marginBottom: 16,
              transition: "all .2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = T.pri}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#ccc"}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>📸</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Click to upload image</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>or drag and drop</div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleImageSelect}
          style={{ display: "none" }}
        />

        {/* Caption Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your video..."
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              border: `1.5px solid #d0d0d0`,
              borderRadius: 12,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
              background: "#fff",
              color: "#1a1a1a",
            }}
          />
        </div>

        {/* Error Message */}
        {err && (
          <div style={{
            background: "#FEE2E2",
            borderRadius: 10,
            padding: 12,
            fontSize: 12,
            color: T.red,
            marginBottom: 16,
          }}>
            ⚠️ {err}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              background: "#f0f0f0",
              border: "1px solid #d0d0d0",
              borderRadius: 8,
              color: "#1a1a1a",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !image || !caption.trim()}
            style={{
              flex: 1,
              padding: 12,
              background: loading ? "#ccc" : T.pri,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !image || !caption.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "Uploading..." : "Post Video 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}




