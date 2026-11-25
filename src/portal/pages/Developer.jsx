import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, BriefcaseBusiness, Code2, ExternalLink, Github, Linkedin, Mail, Sparkles, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router";
import Brand from "../components/common/Brand";
import PortalFooter from "../components/layout/PortalFooter";
import { useAuth } from "../hooks/useAuth";
import { getLastRoute } from "../services/studentService";

const links = [
  ["Email", "mailto:Bhaanugali@gmail.com", Mail],
  ["LinkedIn", "https://www.linkedin.com/in/bhaanu-gali/", Linkedin],
  ["GitHub", "https://github.com/BhaanuG", Github],
  ["LeetCode", "https://leetcode.com/u/GBhaanu/", Code2],
  ["HackerRank", "https://www.hackerrank.com/profile/G_Bhaanu", Trophy],
  ["CodeChef", "https://www.codechef.com/users/g_bhaanu_01", Trophy],
  ["Portfolio", "https://gbhaanu.netlify.app/", BriefcaseBusiness],
];

export default function Developer() {
  const location = useLocation();
  const { studentId } = useAuth();
  const returnTo = location.state?.from || (studentId ? getLastRoute() : "/") || "/";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToExplore = () => {
    const storySection = document.querySelector(".developer-story");
    if (storySection) {
      storySection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollBy({ top: 400, behavior: "smooth" });
    }
  };

  return (
    <div className="developer-shell developer-reference">
      <main className="developer-reference-page">
        <header className="developer-reference-header">
          <Brand />
          <Link className="return-portal" to={returnTo}>
            <ArrowLeft size={18} /> Return to Portal
          </Link>
        </header>

        <article className="developer-reference-card">
          <section className="developer-intro-card">
            <div className="developer-badge">
              <Sparkles size={14} /> PORTAL ARCHITECT &amp; DEVELOPER
            </div>
            <h1>Designed &amp; Developed by<br /><span>G. Bhaanu Sai</span></h1>
            <p className="developer-intro-copy">
              Architected and designed for the Academic Registration Portal interface and user experience at Koneru Lakshmaiah Education Foundation. Crafted with precision for high usability, clear readability, and frictionless registration.
            </p>
            <dl className="developer-details">
              <div>
                <dt>Name</dt>
                <dd>G. Bhaanu Sai</dd>
              </div>
              <div>
                <dt>Registration Number</dt>
                <dd>2400030952</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href="mailto:Bhaanugali@gmail.com">Bhaanugali@gmail.com</a>
                </dd>
              </div>
            </dl>
            <div className="developer-reference-links" aria-label="Developer profiles">
              {links.map(([name, href, Icon]) => (
                <a key={name} href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">
                  <Icon size={15} aria-hidden="true" />
                  <span>{name}</span>
                  <ExternalLink size={10} style={{ opacity: 0.55, marginLeft: "1px" }} />
                </a>
              ))}
            </div>
          </section>

          <section className="developer-story">
            <p className="developer-quote">“Not everything starts with a plan. Some things start with curiosity.”</p>
            <div className="developer-story-body">
              <p>I don't think I ever had a perfect picture of what my future would look like. Even now, there are days when I have ten different ideas in my head and no idea which one I should start with first. But there is one thing I've always enjoyed — the feeling of creating something that didn't exist before.</p>
              <p>I like exploring things. I like knowing what happens behind the screen, how an application works, how people turn an idea into a product, and how a few lines of code can eventually become something used by hundreds or thousands of people. Whenever something interests me, I find it difficult to leave it unexplored.</p>
              <p>That curiosity slowly brought me into the world of technology. At first, there was a lot to figure out. New tools, new languages, unfamiliar concepts, and problems that sometimes took much longer to solve than expected. I remember how exciting it felt when something finally worked, especially after spending so much time trying to understand why it wasn't working.</p>
              <p className="story-emphasis">And then I started wanting to build more.</p>
              <p>I didn't want to stop at learning how websites were made. I wanted to make my own. I became interested in how a design turns into an actual interface, how the frontend communicates with the backend, how databases store information, and how everything comes together to create a complete product.</p>
              <p>Somewhere along the way, my laptop became a place where many of my ideas found their first home.</p>
              <p>There was Sonicly, where I explored the world of music applications, interface design, backend development, and cloud storage. Then came Zyndex, which pushed me to think about a much bigger system and how different parts of an application could work together. Every project had its own story. Some things worked, some didn't, and some needed to be rebuilt. But I enjoyed seeing an idea slowly take shape.</p>
              <p>I also found myself becoming involved in the developer community. My experience with ACM gave me opportunities to take responsibility, work with people, contribute ideas, and understand what happens beyond individual development. I started seeing things from a different perspective. Sometimes the challenge isn't writing the code. It's bringing people together, making decisions, and making sure an idea actually moves forward.</p>
              <p>I won't pretend that everything has been easy. There have been confusing days, unexpected errors, plans that didn't work, and moments when I had to learn something completely new just to move one step ahead. There is still a lot I don't know. But I've stopped looking at that as a problem. There will always be something new to learn, and that's one of the reasons I enjoy this field.</p>
              <p>One thing I've noticed about myself is that I'm rarely satisfied with just getting something done. I keep thinking about what could be better. Could the experience be simpler? Could the design feel more natural? Could the system handle more? Is there a better way to build it? Sometimes that habit makes a small task much bigger than it needs to be, but it also pushes me to look beyond the obvious.</p>
              <p>I have ambitions that go far beyond writing code. I want to create products of my own, lead teams, work on ideas that reach people, and build something that has a life beyond the person who created it. I want to understand the business side of technology just as much as the technical side. I want to be someone who can take an idea, bring the right people together, make the difficult decisions, and take responsibility for the result.</p>
              <p>I know I'm not there yet. There are many things I want to do, many skills I want to develop, and many experiences still waiting for me. I'm not in a hurry to pretend otherwise.</p>
              <p>If you look at this portal, you are looking at one small part of my journey. Behind the interface are hours of thinking, designing, developing, testing, and making decisions. It may look like just another registration portal to someone using it, but to me, it is another opportunity to turn an idea into something real.</p>
              <p className="story-emphasis">And that is what I want to keep doing.</p>
              <p>I don't know exactly where this journey will take me. Maybe some of the ideas I have today will become something much bigger. Maybe I'll discover completely new interests along the way. I am open to both.</p>
              <p>I just know that I don't want to spend my life wondering what I could have built if I had tried.</p>
              <p><strong>There is still so much ahead of me. More ideas, more mistakes, more lessons, more people to meet, and more things to create.</strong></p>
              <p>And when I look back someday, I hope I won't just remember the things I built. I hope I'll remember the person I became while building them.</p>
              <p className="story-closing"><em>This is not the story of someone who has reached the finish line. It's the story of someone who has decided to keep going.</em></p>
            </div>
          </section>
        </article>

        {/* Right-Side Vertical Scroll Indicator Button */}
        <aside
          className={`developer-scroll-indicator ${isScrolled ? "is-hidden" : ""}`}
          aria-hidden={isScrolled ? "true" : undefined}
        >
          <button
            type="button"
            className="scroll-track-button"
            onClick={handleScrollToExplore}
            title="Scroll down to read personal story"
            aria-label="Scroll to explore personal story"
          >
            <span className="scroll-char">S</span>
            <span className="scroll-char">C</span>
            <span className="scroll-char">R</span>
            <span className="scroll-char">O</span>
            <span className="scroll-char">L</span>
            <span className="scroll-char">L</span>
            <span className="scroll-word-gap" />
            <span className="scroll-char">T</span>
            <span className="scroll-char">O</span>
            <span className="scroll-word-gap" />
            <span className="scroll-char">E</span>
            <span className="scroll-char">X</span>
            <span className="scroll-char">P</span>
            <span className="scroll-char">L</span>
            <span className="scroll-char">O</span>
            <span className="scroll-char">R</span>
            <span className="scroll-char">E</span>
            <div className="scroll-cue-arrow">
              <ArrowDown size={13} />
            </div>
          </button>
        </aside>
      </main>
      <PortalFooter returnTo={returnTo} />
    </div>
  );
}
