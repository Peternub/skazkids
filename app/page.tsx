import type { CSSProperties } from "react";
import Image from "next/image";
import { ContactForm } from "@/components/site/contact-form";
import { PricingTabs } from "@/components/site/pricing-tabs";

const heroArtwork = {
  desktop: "/landing/hero-desktop.jpg",
  mobile: "/landing/hero-mobile.jpg"
} as const;

const storyScenes = [
  {
    text: "Вы пришли с работы, а ребенка уже надо укладывать спать.",
    desktop: "/landing/story-1-desktop.jpg",
    mobile: "/landing/story-1-mobile.jpg"
  },
  {
    text: "Ребенок хочет историю, где он главный герой.",
    desktop: "/landing/story-2-desktop.jpg",
    mobile: "/landing/story-2-mobile.jpg"
  },
  {
    text: "И вы вспоминаете про SkazKIDS...",
    desktop: "/landing/story-3-desktop.jpg",
    mobile: "/landing/story-3-mobile.jpg"
  },
  {
    text: "И одной кнопкой создаете новую серию его личного сериала.",
    desktop: "/landing/story-4-desktop.jpg",
    mobile: "/landing/story-4-desktop.jpg"
  }
] as const;

const howSteps = [
  {
    title: "Создайте профиль",
    text: "Расскажите, сколько ребёнку лет, что он любит и кто ему особенно дорог."
  },
  {
    title: "Задайте мир",
    text: "Выберите героев, место действия и настроение будущего сериала."
  },
  {
    title: "Нажмите одну кнопку",
    text: "Каждый вечер сервис продолжит историю с учётом прошлых событий."
  },
  {
    title: "Читайте вместе",
    text: "Получите новую спокойную серию примерно на пять минут чтения."
  }
] as const;

const reviews = [
  {
    src: "/landing/review-1.png",
    alt: "Отзыв о том, что после работы стало проще укладывать сына"
  },
  {
    src: "/landing/review-2.png",
    alt: "Отзыв о персональных историях для дочери"
  },
  {
    src: "/landing/review-3.png",
    alt: "Отзыв о живых текстах и вечернем ритуале"
  }
] as const;

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-hero landing-band landing-band--black">
        <LandingArtwork variant="hero" {...heroArtwork} />
        <div className="landing-hero__content">
          <h1 className="landing-hero__title">
            <span>Skaz</span><strong>KIDS</strong>
          </h1>
          <p className="landing-hero__description">
            <span aria-hidden="true">—</span>
            сервис персональных вечерних сериалов для детей, которые продолжаются одной кнопкой
          </p>
        </div>
        <span className="landing-scroll-hint" aria-hidden="true">Листайте вниз</span>
      </section>

      {storyScenes.map((scene, index) => (
        <section
          key={scene.text}
          className={`landing-story landing-band ${index % 2 === 0 ? "landing-band--gray" : "landing-band--dark"}`}
        >
          <LandingArtwork variant={`scene-${index + 1}`} desktop={scene.desktop} mobile={scene.mobile} />
          <div className="landing-story__content">
            <span className="landing-story__number">0{index + 2}</span>
            <h2>{scene.text}</h2>
          </div>
        </section>
      ))}

      <section id="how" className="landing-section landing-band landing-band--gray">
        <div className="landing-container">
          <SectionHeading eyebrow="Как это устроено" title="Как работает наш сервис" />

          <div className="how-flow">
            <svg className="how-flow__arrows" viewBox="0 0 1200 360" aria-hidden="true">
              <defs>
                <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              <path d="M250 126 C282 62 314 188 352 126" />
              <path d="M548 126 C580 190 612 58 650 126" />
              <path d="M846 126 C880 66 912 188 952 126" />
              <path className="how-flow__return" d="M1064 236 C1010 342 214 350 136 236" />
            </svg>

            <div className="how-flow__grid">
              {howSteps.map((step, index) => (
                <article key={step.title} className="how-card">
                  <div className={`how-card__visual how-card__visual--${index + 1}`} aria-hidden="true">
                    <strong>0{index + 1}</strong>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className="how-card__mobile-arrow" aria-hidden="true">↝</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-section landing-band landing-band--dark landing-shared-background">
        <div className="landing-container">
          <SectionHeading eyebrow="Тарифы" title="Выберите качество своей истории" />
          <div className="landing-section__body">
            <PricingTabs />
          </div>
        </div>
      </section>

      <section id="reviews" className="landing-section landing-band landing-band--gray landing-shared-background">
        <div className="landing-container">
          <SectionHeading eyebrow="Отзывы" title="Вечера, которые стали проще" />
          <div className="landing-reviews">
            {reviews.map((review) => (
              <article key={review.src} className="landing-review">
                <Image
                  src={review.src}
                  alt={review.alt}
                  width={1254}
                  height={1254}
                  sizes="(max-width: 767px) 100vw, 33vw"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="landing-section landing-band landing-band--dark landing-shared-background">
        <div className="landing-container landing-contact">
          <div className="landing-contact__copy">
            <p className="section-heading__eyebrow">Связаться</p>
            <h2>Есть вопрос?<br />Напишите нам.</h2>
            <p>Обсудим сервис, тарифы или любые детали работы SkazKIDS.</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}

function LandingArtwork({
  desktop,
  mobile,
  variant
}: {
  desktop: string;
  mobile: string;
  variant: string;
}) {
  const style = {
    "--landing-art-desktop": `url("${desktop}")`,
    "--landing-art-mobile": `url("${mobile}")`
  } as CSSProperties;

  return (
    <div className={`landing-artwork landing-artwork--${variant}`} style={style} aria-hidden="true" />
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <p className="section-heading__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}
