import React, { useState, useEffect, useRef } from "react";
import {
  VideoCameraIcon,
  MonitorIcon,
  StopIcon,
  UploadIcon,
  RefreshIcon,
  LoadIcon,
  AlertIcon,
  CheckIcon,
  TrashIcon,
} from "./components/Icons";
import { UnsupportedBrowser } from "./components/UnsupportedBrowser";
import type { RecordingType } from "./type";
import { TextFileCard } from "./components/TextFileCard";
import { MediaFileCard } from "./components/MediaFileCard";

// --- Main Application Component ---
export default function App() {
  // State for browser support
  const [isSupported, setIsSupported] = useState<boolean>(false);

  // State for recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentRecordingType, setCurrentRecordingType] =
    useState<RecordingType | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const writableStreamRef = useRef<FileSystemWritableFileStream | null>(null);
  const currentFileHandleRef = useRef<FileSystemFileHandle | null>(null);

  // State for *active* media file handles (the ones in the cards)
  const [activeWebcamFileHandle, setActiveWebcamFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [activeScreenFileHandle, setActiveScreenFileHandle] =
    useState<FileSystemFileHandle | null>(null);

  // State for media playback
  const [webcamPlaybackUrl, setWebcamPlaybackUrl] = useState<string | null>(
    null
  );
  const [screenPlaybackUrl, setScreenPlaybackUrl] = useState<string | null>(
    null
  );

  // State for *active* text file
  const [activeTextFileHandle, setActiveTextFileHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  // State for file inspector
  const [fileList, setFileList] = useState<string[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);

  // State for UI feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // --- API Support Check & Initial File Load ---
  useEffect(() => {
    const checkSupportAndLoad = async () => {
      if (
        "storage" in navigator &&
        "getDirectory" in (navigator as any).storage &&
        "mediaDevices" in navigator &&
        "MediaRecorder" in window
      ) {
        console.log(
          "LOG: All required APIs (OPFS, MediaDevices, MediaRecorder) are supported."
        );
        const isPersisted = await navigator.storage.persisted();
        console.log(`LOG: Storage persisted: ${isPersisted}`);
        if (!isPersisted) {
          const persisted = await navigator.storage.persist();
          console.log(`LOG: Storage persist() result: ${persisted}`);
        }
        setIsSupported(true);
        // Automatically list files on initial load
        await handleListFiles();
      } else {
        console.warn("LOG: One or more required APIs are not supported.");
        setIsSupported(false);
      }
    };
    checkSupportAndLoad();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // --- Text File Logic ---

  /**
   * Handles the text file selection from the <input> element.
   * This creates a NEW file in the OPFS with a UUID.
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]; // Use optional chaining
    if (!file) {
      console.log("LOG: [Text] File selection cancelled.");
      return;
    }
    console.log(
      `LOG: [Text] File selected: "${file.name}" (Size: ${file.size} bytes)`
    );

    clearMessages();
    setIsLoading(true);

    // Clear the active text file to avoid confusion
    setFileContent("");
    setActiveTextFileHandle(null);

    // Generate a unique name
    const newFileName = `text-${crypto.randomUUID()}.txt`;
    console.log(`LOG: [Text-Upload] New file name: ${newFileName}`);

    let writable: FileSystemWritableFileStream | null = null;

    try {
      console.log("LOG: [Text-Upload] Getting filesystem root...");
      const root = await (navigator.storage as any).getDirectory();

      console.log(
        `LOG: [Text-Upload] Getting file handle for "${newFileName}"...`
      );
      const fileHandle: FileSystemFileHandle = await root.getFileHandle(
        newFileName,
        { create: true }
      );

      console.log("LOG: [Text-Upload] Creating writable stream...");
      writable = await fileHandle.createWritable();

      console.log("LOG: [Text-Upload] Creating readable file stream...");
      const fileStream = file.stream();

      console.log("LOG: [Text-Upload] Starting manual chunked write...");
      const reader = fileStream.getReader();

      const CHUNK_SIZE = 5 * 1024; // 5KB
      let chunkCount = 1;

      while (true) {
        const { done, value } = await reader.read(); // 'value' is a Uint8Array
        if (done) {
          console.log("LOG: [Text-Upload] Read complete (end of stream).");
          break;
        }

        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          const subChunk = value.subarray(i, i + CHUNK_SIZE);
          console.log(
            `LOG: [Text-Upload] Writing chunk #${chunkCount} (Size: ${subChunk.length} bytes)`
          );
          await writable.write(subChunk);
          chunkCount++;
        }
      }

      await writable.close();
      console.log(
        "LOG: [Text-Upload] Manual write complete. File written to browser filesystem."
      );

      // Set this new file as the *active* one
      setActiveTextFileHandle(fileHandle);
      setSuccess(`File "${newFileName}" uploaded and loaded successfully!`);

      // Refresh file list after upload
      await handleListFiles();
    } catch (err: any) {
      console.error("LOG: [Text-Upload] Error:", err);
      setError(`Upload failed: ${err.message}`);
      if (writable) {
        await writable.abort();
        console.log("LOG: [Text-Upload] Writable stream aborted due to error.");
      }
    } finally {
      setIsLoading(false);
      event.target.value = ""; // Reset file input
    }
  };

  /**
   * Reads the *active* text file from the browser's filesystem.
   */
  const handleShowFile = async () => {
    if (!activeTextFileHandle) {
      console.warn("LOG: [Text-Show] No active file handle.");
      setError("No text file is loaded.");
      return;
    }

    clearMessages();

    // Toggle content visibility
    if (fileContent) {
      console.log("LOG: [Text-Show] Hiding file content.");
      setFileContent("");
      return;
    }

    console.log("LOG: [Text-Show] Showing file content...");
    setIsLoading(true);

    try {
      const file = await activeTextFileHandle.getFile();
      const content = await file.text();
      setFileContent(content);
      setSuccess(`Showing content for "${activeTextFileHandle.name}".`);
      console.log(`LOG: [Text-Show] Content loaded.`);
    } catch (err: any) {
      console.error("LOG: [Text-Show] Error:", err);
      setError(`Could not read file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Downloads the *active* text file.
   */
  const handleDownloadTextFile = async () => {
    if (!activeTextFileHandle) {
      console.warn("LOG: [Text-Download] No active file handle.");
      setError("No file to download.");
      return;
    }
    console.log("LOG: [Text-Download] Download initiated...");
    clearMessages();

    try {
      await downloadFileFromHandle(activeTextFileHandle);
      setSuccess(`File "${activeTextFileHandle.name}" download initiated.`);
    } catch (err: any) {
      console.error("LOG: [Text-Download] Error:", err);
      setError(`Download failed: ${err.message}`);
    }
  };

  // --- Media File Logic ---

  /**
   * Starts a new recording (webcam or screen).
   */
  const startRecording = async (type: RecordingType) => {
    clearMessages();
    if (isRecording) {
      setError("Another recording is already in progress.");
      return;
    }
    // Also clear text file content if open
    setFileContent("");
    // Clear playback URLs
    setWebcamPlaybackUrl(null);
    setScreenPlaybackUrl(null);

    let stream: MediaStream;
    try {
      if (type === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } else {
        // 'screen'
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: "screen" } as any,
          audio: false,
        });
      }
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error("LOG: [Media-Record] Error getting media stream:", err);
      setError(`Could not start recording: ${err.message}`);
      return;
    }

    // Create file in OPFS before starting recording
    const fileExtension = "webm";
    const newFileName = `${type}-${crypto.randomUUID()}.${fileExtension}`;
    console.log(
      `LOG: [Media-Record] Creating file "${newFileName}" for direct writing`
    );

    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle: FileSystemFileHandle = await root.getFileHandle(
        newFileName,
        { create: true }
      );
      const writable = await fileHandle.createWritable();

      writableStreamRef.current = writable;
      currentFileHandleRef.current = fileHandle;
    } catch (err: any) {
      console.error("LOG: [Media-Record] Error creating file:", err);
      setError(`Could not create recording file: ${err.message}`);
      // Clean up stream
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      return;
    }

    setIsRecording(true);
    setCurrentRecordingType(type);

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && writableStreamRef.current) {
        console.log(
          `LOG: [Media-Record] Writing data directly to file: ${event.data.size} bytes`
        );
        try {
          await writableStreamRef.current.write(event.data);
        } catch (err: any) {
          console.error("LOG: [Media-Record] Error writing data chunk:", err);
          setError(`Recording error: ${err.message}`);
        }
      }
    };

    recorder.onstop = async () => {
      console.log("LOG: [Media-Record] Recording stopped.");

      // Close the writable stream
      if (writableStreamRef.current) {
        try {
          await writableStreamRef.current.close();
          console.log("LOG: [Media-Record] File stream closed successfully.");
        } catch (err: any) {
          console.error("LOG: [Media-Record] Error closing file stream:", err);
        }
        writableStreamRef.current = null;
      }

      // Set the recorded file as the active one
      if (currentFileHandleRef.current) {
        if (type === "webcam") {
          setActiveWebcamFileHandle(currentFileHandleRef.current);
          setWebcamPlaybackUrl(null);
        } else {
          setActiveScreenFileHandle(currentFileHandleRef.current);
          setScreenPlaybackUrl(null);
        }

        setSuccess(
          `Recording "${currentFileHandleRef.current.name}" saved and loaded!`
        );

        // Refresh file list after saving
        await handleListFiles();

        currentFileHandleRef.current = null;
      }

      // Clean up
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setCurrentRecordingType(null);
    };

    recorder.start(1000); // Collect data in 1-second chunks
    console.log(`LOG: [Media-Record] Started ${type} recording.`);
  };

  /**
   * Stops the currently active recording.
   */
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) {
      console.warn("LOG: [Media-Record] Stop called but no active recorder.");
      return;
    }
    console.log("LOG: [Media-Record] Stopping recording...");
    mediaRecorderRef.current.stop();
  };

  /**
   * Gets the *active* file from OPFS and creates a playback URL.
   */
  const handlePlayMedia = async (type: RecordingType) => {
    console.log(`LOG: [Media-Play] Initiated play for ${type}.`);
    const fileHandle =
      type === "webcam" ? activeWebcamFileHandle : activeScreenFileHandle;
    if (!fileHandle) {
      setError(`No ${type} file is loaded.`);
      return;
    }

    // Invalidate old URL first
    if (type === "webcam") setWebcamPlaybackUrl(null);
    else setScreenPlaybackUrl(null);

    try {
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      console.log(`LOG: [Media-Play] Created Object URL: ${url}`);

      if (type === "webcam") {
        setWebcamPlaybackUrl(url);
      } else {
        setScreenPlaybackUrl(url);
      }
    } catch (err: any) {
      console.error("LOG: [Media-Play] Error:", err);
      setError(`Could not play file: ${err.message}`);
    }
  };

  /**
   * Downloads the *active* media file from OPFS.
   */
  const handleDownloadMedia = async (type: RecordingType) => {
    console.log(`LOG: [Media-Download] Initiated download for ${type}.`);
    const fileHandle =
      type === "webcam" ? activeWebcamFileHandle : activeScreenFileHandle;
    if (!fileHandle) {
      setError(`No ${type} file to download.`);
      return;
    }

    try {
      await downloadFileFromHandle(fileHandle);
      setSuccess(`File "${fileHandle.name}" download initiated.`);
    } catch (err: any) {
      console.error("LOG: [Media-Download] Error:", err);
      setError(`Download failed: ${err.message}`);
    }
  };

  // --- File Inspector & Loading Logic ---

  /**
   * Lists all files in the root of the OPFS.
   */
  const handleListFiles = async () => {
    console.log("LOG: [FS-Inspect] Listing files...");
    setIsInspecting(true);

    try {
      const root = await (navigator.storage as any).getDirectory();
      const files: string[] = [];

      for await (const entry of root.values()) {
        if (entry.kind === "file") {
          files.push(entry.name);
        }
      }

      setFileList(files);
      if (files.length > 0) {
        setSuccess(`Found ${files.length} file(s).`);
      } else {
        setSuccess("Filesystem is empty.");
      }
      console.log("LOG: [FS-Inspect] Files found:", files);
    } catch (err: any) {
      console.error("LOG: [FS-Inspect] Error:", err);
      setError(`Could not list files: ${err.message}`);
    } finally {
      setIsInspecting(false);
    }
  };

  /**
   * Loads a file from the OPFS into the correct "Managed File" card.
   */
  const handleLoadFile = async (fileName: string) => {
    console.log(`LOG: [FS-Load] Loading file: ${fileName}`);
    clearMessages();
    setIsLoading(true);

    try {
      const root = await (navigator.storage as any).getDirectory();
      const fileHandle: FileSystemFileHandle = await root.getFileHandle(
        fileName
      );

      // Determine file type from prefix and load it
      if (fileName.startsWith("text-")) {
        setActiveTextFileHandle(fileHandle);
        setFileContent(""); // Clear old content
        // Unload other cards
        setActiveWebcamFileHandle(null);
        setWebcamPlaybackUrl(null);
        setActiveScreenFileHandle(null);
        setScreenPlaybackUrl(null);
        setSuccess(`Loaded text file: ${fileName}`);
      } else if (fileName.startsWith("webcam-")) {
        setActiveWebcamFileHandle(fileHandle);
        setWebcamPlaybackUrl(null); // Clear old video
        // Unload other cards
        setActiveTextFileHandle(null);
        setFileContent("");
        setActiveScreenFileHandle(null);
        setScreenPlaybackUrl(null);
        setSuccess(`Loaded webcam file: ${fileName}`);
      } else if (fileName.startsWith("screen-")) {
        setActiveScreenFileHandle(fileHandle);
        setScreenPlaybackUrl(null); // Clear old video
        // Unload other cards
        setActiveTextFileHandle(null);
        setFileContent("");
        setActiveWebcamFileHandle(null);
        setWebcamPlaybackUrl(null);
        setSuccess(`Loaded screen file: ${fileName}`);
      } else {
        console.warn(`LOG: [FS-Load] Unknown file type: ${fileName}`);
        setError(`Unknown file type: ${fileName}`);
      }
    } catch (err: any) {
      console.error("LOG: [FS-Load] Error:", err);
      setError(`Could not load file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Deletes a file from the OPFS.
   */
  const handleDeleteFile = async (fileName: string) => {
    console.log(`LOG: [FS-Delete] Deleting file: ${fileName}`);
    clearMessages();
    setIsLoading(true);

    try {
      const root = await (navigator.storage as any).getDirectory();
      await root.removeEntry(fileName);
      setSuccess(`Deleted file: ${fileName}`);

      // If the deleted file was active, clear it
      if (
        (fileName.startsWith("text-") &&
          activeTextFileHandle?.name === fileName) ||
        (fileName.startsWith("webcam-") &&
          activeWebcamFileHandle?.name === fileName) ||
        (fileName.startsWith("screen-") &&
          activeScreenFileHandle?.name === fileName)
      ) {
        setActiveTextFileHandle(null);
        setFileContent("");
        setActiveWebcamFileHandle(null);
        setWebcamPlaybackUrl(null);
        setActiveScreenFileHandle(null);
        setScreenPlaybackUrl(null);
      }

      // Refresh file list after deletion
      await handleListFiles();
    } catch (err: any) {
      console.error("LOG: [FS-Delete] Error:", err);
      setError(`Could not delete file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Generic Download Helper ---

  /**
   * Downloads any file given its FileSystemFileHandle.
   */
  const downloadFileFromHandle = async (fileHandle: FileSystemFileHandle) => {
    console.log(
      `LOG: [Download] Getting file from handle "${fileHandle.name}"...`
    );
    const file = await fileHandle.getFile();

    console.log("LOG: [Download] Creating Object URL...");
    const url = URL.createObjectURL(file);

    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("LOG: [Download] Download link clicked and cleaned up.");
  };

  // Render a message if the browser is not supported
  if (!isSupported) {
    return <UnsupportedBrowser />;
  }

  // Main application UI
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100 font-inter">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl md:p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 md:text-3xl">
          Browser File System Manager
        </h1>
        <p className="mt-2 text-center text-gray-600">
          Upload text files or record media, all saved to the browser's
          filesystem.
        </p>

        {/* --- Recording Controls --- */}
        <div className="p-4 mt-6 border-2 border-dashed rounded-lg border-gray-300">
          <h2 className="text-xl font-semibold text-center text-gray-700">
            1. Create New File
          </h2>
          <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-3">
            <button
              onClick={() => startRecording("webcam")}
              disabled={isRecording || isLoading}
              className="flex items-center justify-center w-full px-4 py-3 font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <VideoCameraIcon />
              <span className="ml-2">Record Web/Mic</span>
            </button>
            <button
              onClick={() => startRecording("screen")}
              disabled={isRecording || isLoading}
              className="flex items-center justify-center w-full px-4 py-3 font-medium text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-400"
            >
              <MonitorIcon />
              <span className="ml-2">Record Screen</span>
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="flex items-center justify-center w-full px-4 py-3 font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400"
            >
              <StopIcon />
              <span className="ml-2">Stop</span>
            </button>
          </div>
          {isRecording && (
            <p className="mt-3 text-sm font-medium text-center text-red-600 animate-pulse">
              Recording {currentRecordingType}...
            </p>
          )}
          {/* Text File Upload */}
          <label
            htmlFor="file-upload"
            className="relative flex justify-center w-full px-4 py-6 mt-4 transition bg-white border-2 border-dashed rounded-lg cursor-pointer border-gray-300 hover:border-blue-500"
          >
            <div className="text-center">
              <UploadIcon />
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium text-blue-600">
                  Click to upload a .txt file
                </span>
              </p>
            </div>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".txt"
              onChange={handleFileSelect}
              disabled={isLoading || isRecording}
            />
          </label>
        </div>

        {/* --- Filesystem Inspector --- */}
        <div className="p-4 mt-6 border-2 border-dashed rounded-lg border-gray-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-700">
              2. Filesystem Inspector
            </h2>
            <button
              onClick={() => handleListFiles()}
              disabled={isInspecting || isLoading || isRecording}
              className="flex items-center justify-center p-2 text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-700 disabled:bg-gray-400"
            >
              <RefreshIcon />
            </button>
          </div>

          {fileList.length > 0 ? (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
              {fileList.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2 text-sm bg-gray-100 rounded-lg"
                >
                  <span className="flex-1 truncate" title={name}>
                    {name}
                  </span>
                  <button
                    onClick={() => handleLoadFile(name)}
                    disabled={isLoading || isRecording}
                    className="flex items-center justify-center px-3 py-1 ml-2 text-xs font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <LoadIcon />
                    <span className="ml-1">Load</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFile(name)}
                    disabled={isLoading || isRecording}
                    className="flex items-center justify-center px-3 py-1 ml-2 text-xs font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    <TrashIcon />
                    <span className="ml-1">Delete</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-center text-gray-500">
              Filesystem is empty. Create a file to see it here.
            </p>
          )}
        </div>

        {/* --- File Management --- */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-center text-gray-700">
            3. Active File Manager
          </h2>
          <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-1">
            {/* Text File Card */}
            <TextFileCard
              title="Text File"
              activeFileHandle={activeTextFileHandle}
              fileContent={fileContent}
              onShow={handleShowFile}
              onDownload={handleDownloadTextFile}
              isRecording={isRecording}
              isLoading={isLoading}
            />
            {/* Media File Cards */}
            <MediaFileCard
              title="Webcam & Mic File"
              activeFileHandle={activeWebcamFileHandle}
              playbackUrl={webcamPlaybackUrl}
              onPlay={() => handlePlayMedia("webcam")}
              onDownload={() => handleDownloadMedia("webcam")}
              isRecording={isRecording}
            />
            <MediaFileCard
              title="Screen Recording File"
              activeFileHandle={activeScreenFileHandle}
              playbackUrl={screenPlaybackUrl}
              onPlay={() => handlePlayMedia("screen")}
              onDownload={() => handleDownloadMedia("screen")}
              isRecording={isRecording}
            />
          </div>
        </div>

        {/* --- Loading, Error, and Success Messages --- */}
        <div className="mt-4 min-h-[50px]">
          {isLoading && (
            <div className="flex items-center justify-center p-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-lg">
              <svg
                className="w-5 h-5 mr-2 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </div>
          )}
          {error && (
            <div className="flex items-center p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg">
              <AlertIcon />
              <span className="ml-2">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center p-3 text-sm font-medium text-green-800 bg-green-100 rounded-lg">
              <CheckIcon />
              <span className="ml-2">{success}</span>
            </div>
          )}
        </div>

        {/* --- File Content Display --- */}
        {fileContent && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Content of "{activeTextFileHandle?.name}":
            </h3>
            <pre className="w-full p-4 mt-2 overflow-auto text-sm text-gray-800 bg-gray-100 border border-gray-300 rounded-lg max-h-60">
              {fileContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
