import { PlayIcon, DownloadIcon } from "./Icons";
import { MediaFileCardProps } from "../type";

export const MediaFileCard = ({
  title,
  activeFileHandle,
  playbackUrl,
  onPlay,
  onDownload,
  isRecording,
}: MediaFileCardProps) => (
  <div className="p-4 bg-gray-100 rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    {activeFileHandle ? (
      <p className="text-sm text-green-600 truncate">
        Loaded: <span className="font-medium">{activeFileHandle.name}</span>
      </p>
    ) : (
      <p className="text-sm text-gray-500">No file loaded.</p>
    )}
    <div className="flex gap-2 mt-3">
      <button
        onClick={onPlay}
        disabled={!activeFileHandle || isRecording}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        <PlayIcon />
        <span className="ml-2">Play</span>
      </button>
      <button
        onClick={onDownload}
        disabled={!activeFileHandle || isRecording}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400"
      >
        <DownloadIcon />
        <span className="ml-2">Download</span>
      </button>
    </div>
    {playbackUrl && (
      <video src={playbackUrl} controls className="w-full mt-3 rounded-lg" />
    )}
  </div>
);
