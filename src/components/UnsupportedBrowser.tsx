export const UnsupportedBrowser = () => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100 font-inter">
      <div className="w-full max-w-md p-6 text-center bg-white rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-red-600">
          Browser Not Supported
        </h1>
        <p className="mt-4 text-gray-700">
          This application uses APIs (OPFS, MediaDevices) which are not fully
          supported by your current browser.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Please try again with a modern browser like Chrome, Edge, Firefox, or
          Safari (v17.2 or newer).
        </p>
      </div>
    </div>
  );
};
