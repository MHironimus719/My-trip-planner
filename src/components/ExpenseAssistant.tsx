import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, X, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExpenseAssistantProps {
  onDataExtracted: (data: any) => void;
  onImagesReady?: (images: string[]) => void;
}

export function ExpenseAssistant({ onDataExtracted, onImagesReady }: ExpenseAssistantProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          if (newImages.length === files.length || i === files.length - 1) {
            setImages((prev) => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setImages((prev) => [...prev, event.target.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (!text && images.length === 0) {
      toast({
        title: "Input Required",
        description: "Please provide text description or upload receipt images",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-expense-info', {
        body: {
          text: text || undefined,
          images: images.length > 0 ? images : undefined,
        },
      });

      if (error) throw error;

      onDataExtracted(data.data);
      
      // Pass images to parent for storage upload, then clear text only
      if (images.length > 0) {
        onImagesReady?.(images);
      }
      setText("");

      toast({
        title: "Success",
        description: "Expense extracted! Please verify all details before saving.",
      });
    } catch (error) {
      console.error('Error extracting expense info:', error);
      toast({
        title: "Error",
        description: "Failed to extract expense information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">AI Expense Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload receipt photos or describe your expense. AI will extract the details automatically.
        </p>

        <Textarea
          placeholder="Describe the expense or paste additional details here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          rows={3}
          className="resize-none"
        />

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Receipt ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-w-0"
          >
            <Camera className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Take Photo</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const input = fileInputRef.current;
              if (input) {
                input.removeAttribute('capture');
                input.click();
                setTimeout(() => input.setAttribute('capture', 'environment'), 100);
              }
            }}
            className="flex-1 min-w-0"
          >
            <Upload className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
            <span className="truncate">Upload</span>
          </Button>

          <Button
            type="button"
            onClick={handleExtract}
            disabled={isProcessing || (!text && images.length === 0)}
            className="flex-1 min-w-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin shrink-0" />
                <span className="truncate">Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Extract</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
