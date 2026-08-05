import os
import cv2
from PIL import Image

def extract_frames(video_path, output_dir, quality=80):
    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}")
        return

    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Video Info: {width}x{height} @ {fps:.2f} FPS, Total Frames: {total_frames}")

    frame_count = 0
    saved_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        # Convert BGR (OpenCV) to RGB (PIL)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_frame)

        # Output filename: frame-0001.webp, frame-0002.webp, etc.
        filename = f"frame-{frame_count:04d}.webp"
        filepath = os.path.join(output_dir, filename)

        # Save as WebP with quality=80
        pil_img.save(filepath, "WEBP", quality=quality, method=4)
        saved_count += 1

        if saved_count % 20 == 0 or saved_count == total_frames:
            print(f"Processed {saved_count}/{total_frames} frames...")

    cap.release()
    print(f"Successfully extracted {saved_count} frames to '{output_dir}'.")

if __name__ == "__main__":
    video_file = "Dra Ilza Video.mp4"
    output_folder = os.path.join("public", "frames")
    extract_frames(video_file, output_folder, quality=80)
