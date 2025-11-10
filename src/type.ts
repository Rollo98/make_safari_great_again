export type RecordingType = "webcam" | "screen";

export type MediaFileCardProps = {
  title: string;
  activeFileHandle: FileSystemFileHandle | null; // Handle for the currently loaded file
  playbackUrl: string | null;
  onPlay: () => void;
  onDownload: () => void;
  isRecording: boolean;
};

export type TextFileCardProps = {
  title: string;
  activeFileHandle: FileSystemFileHandle | null; // Handle for the currently loaded file
  fileContent: string;
  onShow: () => void;
  onDownload: () => void;
  isRecording: boolean;
  isLoading: boolean;
};
