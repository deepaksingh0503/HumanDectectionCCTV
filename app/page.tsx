"use client";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { beep } from "@/utils/audio";
import * as cocossd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import { ObjectDetection, DetectedObject } from "@tensorflow-models/coco-ssd";
import {
  Camera,
  FlipHorizontal,
  FlipHorizontal2,
  MoonIcon,
  PersonStanding,
  SunIcon,
  Video,
  Volume2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Rings } from "react-loader-spinner";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { drawOnCanvas } from "@/utils/draw";

type Props = {};
let interval: any = null;
let stopTimeout: any = null;
const HomePage = (props: Props) => {
  //states
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAutoRecording, setIsAutoRecording] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [model, setModel] = useState<ObjectDetection>();
  const [loading, setLoading] = useState<boolean>(false);
  //refs
  const webCamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoConstraints = {
    facingMode: "user",
  };

  useEffect(() => {
    if (webCamRef && webCamRef.current) {
      const stream = (webCamRef.current.video as any).captureStream();
      if (stream) {
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const blob = new Blob([e.data], { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `video-${Date.now()}.mp4`;
            a.click();
          }
        };
        mediaRecorderRef.current.onstart = () => {
          setIsRecording(true);
        };
        mediaRecorderRef.current.onstop = () => {
          setIsRecording(false);
        };
      }
    }
  }, [webCamRef]);
  useEffect(() => {
    setLoading(true);

    initModel();
  }, []);
  useEffect(() => {
    if (model) {
      setLoading(false);
    }
  });
  async function initModel() {
    const lodedModel: ObjectDetection = await cocossd.load({
      base: "mobilenet_v2",
    });
    setModel(lodedModel);
  }

  async function runPrediction() {
    if (
      model &&
      webCamRef.current &&
      webCamRef.current.video &&
      webCamRef.current.video.readyState === 4
    ) {
      const prediction: DetectedObject[] = await model.detect(
        webCamRef.current.video
      );
      // console.log(prediction);

      resizeCanvas(webCamRef, canvasRef);
      drawOnCanvas(prediction, canvasRef.current?.getContext("2d"), mirrored);
      let isPerson: boolean = false;
      if (prediction.length > 0 && isAutoRecording) {
        prediction.forEach((prediction) => {
          isPerson = prediction.class === "person";
        });
        if (isPerson) {
          startRecording();
        }
      }
    }
  }

  useEffect(() => {
    interval = setInterval(async () => {
      await runPrediction();
    }, 100);
    return () => clearInterval(interval);
  }, [model, webCamRef.current, mirrored, isAutoRecording, runPrediction]);
  return (
    <div className="flex h-screen ">
      {/* Left division - webcam and Canvas  */}
   
      <div className="relative">

        <div className="relative h-screen w-full">
          <Webcam
            ref={webCamRef}
            videoConstraints={videoConstraints}
            mirrored={mirrored}
            className="h-full w-full object-contain p-2"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 h-full w-full object-contain"
          ></canvas>
        </div>
      </div>

      {/* Right division - for button panel and wiki section  */}
      <div className="flex flex-row flex-1">
        <div className="border-primary/5 border-2 max-w-xs flex flex-col gap-2 justify-between shadow-md rounded-md p-4">
          {/* Top section  */}

          <div className="flex flex-col gap-2">
            <ModeToggle />
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={() => {
                setMirrored((prev) => !prev);
              }}
            >
              <FlipHorizontal2 />
            </Button>
            <Separator className="my-2" />
          </div>

          {/* Middle section */}
          <div className="flex flex-col gap-2">
            <Separator className="my-2" />
            <Button
              variant={"outline"}
              size={"icon"}
              onClick={userPromptScreenshot}
            >
              <Camera />
            </Button>

            <Button
              variant={isRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={userPromptRecord}
            >
              <Video />
            </Button>
            <Button
              variant={isAutoRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={toggleAutoRecord}
            >
              {isAutoRecording ? (
                <Rings color="white" height={45} />
              ) : (
                <PersonStanding />
              )}
            </Button>

            <Separator className="my-2" />
          </div>

          {/* Bottom section */}
          <div className="flex flex-col gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} size={"icon"}>
                  <Volume2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Slider
                  max={1}
                  min={0}
                  step={0.01}
                  defaultValue={[volume]}
                  onValueCommit={(value) => {
                    setVolume(value[0]);
                    beep(value[0]);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Separator className="my-2" />
          </div>
        </div>
        <div className="h-full flex-1 py-4 px-2 overflow-scroll ">
          <RenderFeatureHighLightSection />
        </div>
      </div>
      {loading && (
        <div className="z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground">
          Getting things ready . . . <Rings height={50} color="red" />
        </div>
      )}
    </div>
  );

  function userPromptScreenshot() {
    if (!webCamRef.current) {
      toast("Webcam not found Please check your camera");
    } else {
      const imgsrc = webCamRef.current.getScreenshot();
      const blob = base64toBlob(imgsrc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.png`;
      a.click();
    }
  }

  function RenderFeatureHighLightSection() {
    return (
      <div className="text-xs text-muted-foreground">
        <ul className="space-y-4">
          <li>
            <strong>Dark Mode/Sys Theme 🌗</strong>
            <p>Toggle between dark mode and system theme.</p>
            <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
              <SunIcon size={14} />
            </Button>{" "}
            /{" "}
            <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
              <MoonIcon size={14} />
            </Button>
          </li>
          <li>
            <strong>Horizontal Flip ↔️</strong>
            <p>Adjust horizontal orientation.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={"outline"}
              size={"icon"}
              onClick={() => {
                setMirrored((prev) => !prev);
              }}
            >
              <FlipHorizontal size={14} />
            </Button>
          </li>
          <Separator />
          <li>
            <strong>Take Pictures 📸</strong>
            <p>Capture snapshots at any moment from the video feed.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={"outline"}
              size={"icon"}
              onClick={userPromptScreenshot}
            >
              <Camera size={14} />
            </Button>
          </li>
          <li>
            <strong>Manual Video Recording 📽️</strong>
            <p>Manually record video clips as needed.</p>
            <Button
              className="h-6 w-6 my-2"
              variant={isRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={userPromptRecord}
            >
              <Video size={14} />
            </Button>
          </li>
          <Separator />
          <li>
            <strong>Enable/Disable Auto Record 🚫</strong>
            <p>
              Option to enable/disable automatic video recording whenever
              required.
            </p>
            <Button
              className="h-6 w-6 my-2"
              variant={isAutoRecording ? "destructive" : "outline"}
              size={"icon"}
              onClick={toggleAutoRecord}
            >
              {isAutoRecording ? (
                <Rings color="white" height={30} />
              ) : (
                <PersonStanding size={14} />
              )}
            </Button>
          </li>

          <li>
            <strong>Volume Slider 🔊</strong>
            <p>Adjust the volume level of the notifications.</p>
          </li>
          <li>
            <strong>Camera Feed Highlighting 🎨</strong>
            <p>
              Highlights persons in{" "}
              <span style={{ color: "#FF0F0F" }}>red</span> and other objects in{" "}
              <span style={{ color: "#00B612" }}>green</span>.
            </p>
          </li>
          <Separator />
          <li className="space-y-4">
            <strong>Share your thoughts 💬 </strong>
            {/* <SocialMediaLinks/> */}
            <br />
            <br />
            <br />
          </li>
        </ul>
      </div>
    );
  }

  function userPromptRecord() {
    if (!webCamRef.current) {
      toast("Webcam not found Please check your camera");
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData();
      clearTimeout(stopTimeout);
      mediaRecorderRef.current.stop();
      toast("Recording has been stopped and saved to downloads");
    } else {
      startRecording();
    }
  }

  function startRecording() {
    if (
      webCamRef.current &&
      mediaRecorderRef.current &&
      mediaRecorderRef.current?.state !== "recording"
    ) {
      mediaRecorderRef.current.start();
      beep(volume);
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
          toast("Recording has been stopped and saved to downloads");
        }
      }, 30000);
      toast("Recording has been started");
    }
  }
  function toggleAutoRecord() {
    if (isAutoRecording) {
      setIsAutoRecording(false);
      toast("Auto recording has been disabled");
    } else {
      setIsAutoRecording(true);
      toast("Auto recording has been enabled");
    }
  }
};

export default HomePage;
function resizeCanvas(
  webCamRef: React.RefObject<Webcam>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  const video = webCamRef.current?.video;
  const canvas = canvasRef.current;

  if (canvas && video) {
    const { videoWidth, videoHeight } = video;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
}

function base64toBlob(base64Data: any) {
  const byteCharacters = atob(base64Data.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteCharacters.length);
  const byteArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: "image/png" }); // Specify the image type here
}
