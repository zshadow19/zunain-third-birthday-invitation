import Image from "next/image";
import Link from "next/link";
import artwork from "@/public/dinosaur_jungle_birthday_invitation_artwork.png";
import { InvitationExperience } from "./components/invitation-experience";
import { Footprint } from "./components/jungle-envelope";

export default function Home() {
  return (
    <main className="invitation-page">
      <h1 className="sr-only">Zunain’s third birthday</h1>
      <header className="masthead">
        <Link className="wordmark" href="/" aria-label="Zunain’s third birthday invitation"><Footprint /><span>ZUNAIN IS THREE</span></Link>
        <span className="masthead-date">21 . 11 . 2026</span>
      </header>
      <InvitationExperience>
        <Image src={artwork}
          alt="Let’s roar it up! Zunain is turning 3. Join us to celebrate on Saturday, 21 November 2026, at 6:30 pm, 9th Floor, Lakeshore Heights, Gulshan 1, Dhaka. Watercolor dinosaurs and tropical leaves decorate the invitation."
          sizes="(max-width: 512px) calc(100vw - 32px), 480px" preload className="invitation-artwork" />
      </InvitationExperience>
      <footer className="page-footer">LITTLE MOMENTS. BIG MEMORIES.</footer>
    </main>
  );
}
