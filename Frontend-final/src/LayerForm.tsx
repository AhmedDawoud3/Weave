import { useState } from "react";
// 1. استيراد المكونات الاحترافية من مجلد ui
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

export default function LayerForm() {
  const [nodeType, setNodeType] = useState("Conv2d");
  const [inChannels, setInChannels] = useState(3);
  const [outChannels, setOutChannels] = useState(16);
  const [kernelSize, setKernelSize] = useState(3);
  const [result, setResult] = useState("");

  const handleSubmit = async () => {
    const jsonData = {
      node_type: nodeType,
      params: {}
    };

    if (nodeType === "Conv2d") {
      jsonData.params = { in_channels: inChannels, out_channels: outChannels, kernel_size: kernelSize };
    } else if (nodeType === "Linear") {
      jsonData.params = { in_features: inChannels, out_features: outChannels };
    } else if (nodeType === "Softmax") {
      jsonData.params = { dim: 1 };
    } else if (nodeType === "Dropout") {
      jsonData.params = { p: 0.5 };
    } else if (nodeType === "Flatten") {
      jsonData.params = { start_dim: 1, end_dim: -1 };
    } else {
      jsonData.params = {};
    }

    const response = await fetch("http://localhost:5000/create-layer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonData)
    });

    const data = await response.json();
    setResult(data.layer);
  };

  return (
    // 2. تغليف الفورم بـ Card ليعطي شكل منظم واحترافي
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-primary/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-primary">Add New Layer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* اختيار نوع الـ Layer باستخدام Shadcn Select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layer Type</Label>
          <Select onValueChange={(value) => setNodeType(value)} defaultValue={nodeType}>
            <SelectTrigger className="w-full bg-background/50 border-primary/30">
              <SelectValue placeholder="Select Layer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Conv2d">Conv2d</SelectItem>
              <SelectItem value="Linear">Linear</SelectItem>
              <SelectItem value="ReLU">ReLU</SelectItem>
              <SelectItem value="GELU">GELU</SelectItem>
              <SelectItem value="Softmax">Softmax</SelectItem>
              <SelectItem value="Dropout">Dropout</SelectItem>
              <SelectItem value="Flatten">Flatten</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* الحقول الخاصة بالـ Conv2d و Linear باستخدام Shadcn Input */}
        {(nodeType === "Conv2d" || nodeType === "Linear") && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">In Channels/Features</Label>
              <Input
                type="number"
                value={inChannels}
                onChange={(e) => setInChannels(Number(e.target.value))}
                className="bg-background/50 border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Out Channels/Features</Label>
              <Input
                type="number"
                value={outChannels}
                onChange={(e) => setOutChannels(Number(e.target.value))}
                className="bg-background/50 border-primary/20"
              />
            </div>
          </div>
        )}

        {nodeType === "Conv2d" && (
          <div className="space-y-2">
            <Label className="text-xs">Kernel Size</Label>
            <Input
              type="number"
              value={kernelSize}
              onChange={(e) => setKernelSize(Number(e.target.value))}
              className="bg-background/50 border-primary/20"
            />
          </div>
        )}

        {/* زر الإضافة بتصميم Shadcn */}
        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/80 text-white font-bold transition-all shadow-lg shadow-primary/20">
          Add Layer
        </Button>

        {result && (
          <div className="mt-4 p-3 rounded-md bg-secondary/30 border border-primary/10 text-xs font-mono text-primary-foreground animate-in fade-in slide-in-from-top-1">
            Layer created: {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}