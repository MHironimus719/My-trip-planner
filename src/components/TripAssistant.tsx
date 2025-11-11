import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, Sparkles, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TripAssistantProps {
  onDataExtracted: (data: any) => void;
}

export function TripAssistant({ onDataExtracted }: TripAssistantProps) {
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ file: File; url: string; type: string }[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [extractedData, setExtractedData] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
        toast({
          title: "Images pasted",
          description: `${files.length} image(s) added`,
        });
      }
    };

    textarea.addEventListener('paste', handlePaste);
    return () => textarea.removeEventListener('paste', handlePaste);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 20MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Create previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls(prev => [
            ...prev,
            { file, url: e.target?.result as string, type: 'image' }
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrls(prev => [
          ...prev,
          { file, url: '', type: 'document' }
        ]);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileToRemove));
    setPreviewUrls(prev => prev.filter(p => p.file !== fileToRemove));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtract = async () => {
    if (!message.trim() && selectedFiles.length === 0) {
      toast({
        title: "Input required",
        description: "Please enter trip details or upload documents",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const imageDataArray: string[] = [];

      // Convert all image files to base64
      for (const file of selectedFiles) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          const imageData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          imageDataArray.push(imageData);
        }
      }

      // Build user message
      const userContent: any[] = [];
      if (message.trim()) {
        userContent.push({
          type: "text",
          text: message.trim()
        });
      }
      
      if (imageDataArray.length > 0) {
        imageDataArray.forEach(imageData => {
          userContent.push({
            type: "image_url",
            image_url: { url: imageData }
          });
        });
      }

      const userMessage = {
        role: "user",
        content: userContent.length === 1 && userContent[0].type === "text" 
          ? userContent[0].text 
          : userContent
      };

      const { data, error } = await supabase.functions.invoke("extract-trip-info", {
        body: {
          message: message.trim(),
          images: imageDataArray,
          conversationHistory: [...conversationHistory, userMessage],
          currentData: extractedData
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
        // Merge new data with existing data
        const mergedData = { ...extractedData, ...data.data };
        setExtractedData(mergedData);
        
        // Update conversation history
        setConversationHistory(prev => [
          ...prev, 
          userMessage,
          {
            role: "assistant",
            content: `Extracted and updated trip information. ${Object.keys(data.data).length} fields processed.`
          }
        ]);
        
        // Pass merged data to form
        onDataExtracted(mergedData);
        
        toast({
          title: "Success!",
          description: conversationHistory.length > 0 
            ? "Trip information updated with new details"
            : "Trip information extracted and filled into the form",
        });
        
        // Clear current input but keep conversation going
        setMessage("");
        setSelectedFiles([]);
        setPreviewUrls([]);
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
            {conversationHistory.length === 0 
              ? "Paste your trip details, booking confirmation, or upload/paste images and documents. I'll extract all the information for you."
              : "Continue adding more details, upload additional documents, or make corrections. I'll update the form with new information."}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={conversationHistory.length === 0 
            ? "Example: I'm flying to San Francisco on United Airlines flight UA 123 on March 15th, 2025, returning on March 20th. Staying at the Marriott Downtown...\n\nYou can also paste images directly here (Ctrl+V / Cmd+V)"
            : "Add more details like: Actually the flight is UA 456, or upload additional documents..."}
          rows={4}
          className="resize-none"
          disabled={isProcessing}
        />

        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {previewUrls.map((preview, index) => (
              <div key={index} className="relative group">
                {preview.type === 'image' ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={preview.url} 
                      alt={`Preview ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => removeFile(preview.file)}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted flex flex-col items-center justify-center p-3">
                    <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-center truncate w-full">{preview.file.name}</p>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => removeFile(preview.file)}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {(preview.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ))}
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
            multiple
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
          <Button
            onClick={handleExtract}
            disabled={isProcessing || (!message.trim() && selectedFiles.length === 0)}
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
