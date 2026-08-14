import Navbar from "../components/client/Navbar";
import Hero from "../components/client/Hero";
import Services from "../components/client/Services";
import About from "../components/client/About";
import WhyExcwa from "../components/client/WhyExcwa";
import Technologies from "../components/client/Technologies";
import Process from "../components/client/Process";
import Contact from "../components/client/Contact";

export default function Home() {

  return (
    <>
      <Navbar />

      <main>

        <Hero />

        <Services />

        <About />

        <WhyExcwa />

        <Technologies />

        <Process />

        <Contact />

      </main>
    </>
  );
}