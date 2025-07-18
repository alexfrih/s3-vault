import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Key, Archive, Loader2, Link } from "lucide-react";
import { api, S3Config } from "../lib/api";
import { cn } from "../lib/utils";

interface ConnectFormProps {
  onConnect: () => void;
  onCancel?: () => void;
}

export function ConnectForm({ onConnect, onCancel }: ConnectFormProps) {
  const [config, setConfig] = useState<S3Config>({
    access_key_id: "",
    secret_access_key: "",
    region: "",
    bucket_name: "",
    endpoint_url: "",
  });

  // Load saved credentials when showing settings
  useEffect(() => {
    if (onCancel) {
      api.loadSavedCredentials().then((creds) => {
        if (creds) {
          setConfig({
            access_key_id: creds.access_key_id,
            secret_access_key: creds.secret_access_key,
            region: creds.region || "",
            bucket_name: creds.bucket_name,
            endpoint_url: creds.endpoint_url || "",
          });
        }
      });
    }
  }, [onCancel]);

  const connectMutation = useMutation({
    mutationFn: api.connect,
    onSuccess: onConnect,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectMutation.mutate(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-zinc-200 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="./picto.svg" alt="v0lt" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-900">v0lt</h1>
          <p className="text-zinc-600 mt-2">
            {onCancel ? "Update your connection settings" : "Connect to your S3-compatible storage"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Endpoint URL
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="url"
                value={config.endpoint_url || ""}
                onChange={(e) => setConfig({ ...config, endpoint_url: e.target.value })}
                className="pl-10 pr-3 py-2 w-full border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                placeholder="https://s3.amazonaws.com (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Access Key ID
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={config.access_key_id}
                onChange={(e) => setConfig({ ...config, access_key_id: e.target.value })}
                className="pl-10 pr-3 py-2 w-full border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Secret Access Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                value={config.secret_access_key}
                onChange={(e) => setConfig({ ...config, secret_access_key: e.target.value })}
                className="pl-10 pr-3 py-2 w-full border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                required
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Bucket Name
            </label>
            <div className="relative">
              <Archive className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={config.bucket_name}
                onChange={(e) => setConfig({ ...config, bucket_name: e.target.value })}
                className="pl-10 pr-3 py-2 w-full border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          {connectMutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {String(connectMutation.error)}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className={cn(
                "flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                !onCancel && "w-full"
              )}
            >
              {connectMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {onCancel ? "Saving..." : "Connecting..."}
                </span>
              ) : (
                onCancel ? "Save Changes" : "Connect"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}