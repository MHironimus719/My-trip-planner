import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, Sparkles, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TripAssistantProps {
  onDataExtracted: (data: any) => void;
}

export function TripAssistant({ onDataExtracted }: TripAssistantProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 20MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtract = async () => {
    if (!message.trim() && !selectedFile) {
      toast({
        title: "Input required",
        description: "Please enter trip details or upload a document",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      let imageData = null;

      // Convert file to base64 if it's an image
      if (selectedFile && selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const { data, error } = await supabase.functions.invoke("extract-trip-info", {
        body: {
          message: message.trim(),
          imageData,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Extraction failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        onDataExtracted(data.data);
        toast({
          title: "Success!",
          description: "Trip information extracted and filled into the form",
        });
        setMessage("");
        removeFile();
      }
    } catch (error) {
      console.error("Error extracting trip info:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract trip information",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">AI Trip Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Paste your trip details, booking confirmation, or upload an image/document, and I'll extract the information
            for you.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Example: I'm flying to San Francisco on United Airlines flight UA 123 on March 15th, 2025, returning on March 20th. Staying at the Marriott Downtown..."
          rows={4}
          className="resize-none"
          disabled={isProcessing}
        />

        {selectedFile && (
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              disabled={isProcessing}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
          <Button
            onClick={handleExtract}
            disabled={isProcessing || (!message.trim() && !selectedFile)}
            className="gap-2 flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract & Fill Form
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
