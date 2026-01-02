import { Viewport } from "@/components/ui/viewport";
import Canvas from "@/components/common/Canvas";
export default function Home() {
  return (
    <div className="w-full h-dvh text-text">
    {/*No props coz i used Context clean shi*/}
      <Viewport>
        <Canvas/>
      </Viewport>
    </div>
  );
}
