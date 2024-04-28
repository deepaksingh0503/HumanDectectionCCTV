import { ObjectDetection, DetectedObject } from "@tensorflow-models/coco-ssd";

export function drawOnCanvas(prediction: DetectedObject[], ctx: CanvasRenderingContext2D | null | undefined, mirrored: boolean) {


    prediction.forEach((detectedObjects: DetectedObject) => {
        const { class: name, bbox, score } = detectedObjects;
        const [x, y, width, height] = bbox;
        if (ctx) {
            ctx.beginPath();

            ctx.fillStyle = name==='person'?"#FF0F0F":"#00B612";
            ctx.globalAlpha = 0.4;
            mirrored? ctx.roundRect(ctx.canvas.width-x , y,-width,height,8) :ctx.roundRect(x,y,width,height,8);
            ctx.fill();
            
            ctx.font = "12px Courier New";
            ctx.globalAlpha = 1;
            ctx.fillStyle = "black";


          mirrored?ctx.fillText(name,ctx.canvas.width-x-width +10,y+20):  ctx.fillText(name,x+10,y+20)
        }
    }
    );
}


