import { TextFileCardProps } from "../type";
import { EyeIconActive, EyeIcon, DownloadIcon } from "./Icons";

export const TextFileCard = ({
  title,
  activeFileHandle,
  fileContent,
  onShow,
  onDownload,
  isRecording,
  isLoading,
}: TextFileCardProps) => (
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
        onClick={onShow}
        disabled={!activeFileHandle || isRecording || isLoading}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {fileContent ? <EyeIconActive /> : <EyeIcon />}
        <span className="ml-2">{fileContent ? "Hide" : "Show"}</span>
      </button>
      <button
        onClick={onDownload}
        disabled={!activeFileHandle || isRecording || isLoading}
        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400"
      >
        <DownloadIcon />
        <span className="ml-2">Download</span>
      </button>
    </div>
  </div>
);
