export async function uploadFileValidator(file: File): Promise<{ valid: boolean; error?: string }> {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = [
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/ogg",
    "video/mp4",
    "video/webm",
  ];

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Supported: audio/video files",
    };
  }

  return { valid: true };
}

export async function uploadFileToStorage(file: File): Promise<string> {
  // This would integrate with S3, GCS, or similar
  // For now, return a placeholder URL
  const formData = new FormData();
  formData.append("file", file);

  try {
    // In production, upload to cloud storage
    // const response = await fetch('/api/upload', { method: 'POST', body: formData });
    // return response.json().url;

    // Placeholder
    return `https://storage.example.com/${file.name}`;
  } catch (error) {
    throw new Error("Upload failed");
  }
}
