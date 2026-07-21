document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("video").forEach(video => {
        video.muted = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.preload = "auto";

        video.load();

        video.play().catch(() => { });
    });
});