"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  BookOpen,
  Eye,
  FileText,
  Clock,
  Play,
  Pause,
  RotateCcw,
  BookOpenCheck,
  ToggleLeft,
  Layers,
  Eraser,
  PenTool,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./markdown-renderer";
import {
  blocksToPageContent,
  groupBlocksIntoPages,
  mergePagesToCount,
  splitMarkdownIntoBlocks,
} from "@/lib/notebook-pagination";

interface HandwritingViewProps {
  content: string;
  title?: string;
  targetPages?: number;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    rotateY: direction > 0 ? -12 : 12,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    rotateY: direction > 0 ? 12 : -12,
    scale: 0.96,
    transition: {
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  }),
};

export function HandwritingView({ content, title, targetPages }: HandwritingViewProps) {
  // --- Styling Settings ---
  const [paperType, setPaperType] = useState<"ruled" | "grid" | "dotted" | "blank">("ruled");
  const [activeFont, setActiveFont] = useState<"cursive" | "neat" | "architect">("cursive");
  const [inkColor, setInkColor] = useState<"blue" | "black" | "red" | "green">("blue");
  const [showMarginLine, setShowMarginLine] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"single" | "double">("double");
  const [stickyText, setStickyText] = useState("Key Takeaways:\n1. Revise before exam\n2. Solve practice tests\n3. Review diagrams");
  const [showSticky, setShowSticky] = useState(true);
  const [stickyColor, setStickyColor] = useState<"yellow" | "blue" | "pink">("yellow");

  // --- Pagination & Navigation ---
  const [pageIndex, setPageIndex] = useState(0); // single-page index
  const [doublePageIndex, setDoublePageIndex] = useState(0); // double-page index
  const [direction, setDirection] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const measureRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // --- Pomodoro Study Timer ---
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // --- Auto layout detection ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLayoutMode("single");
      } else {
        setLayoutMode("double");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Study Timer Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const blocks = useMemo(() => splitMarkdownIntoBlocks(content), [content]);

  // --- Custom CSS variables mapped to selections ---
  const notebookStyle = useMemo(() => {
    const fontMap = {
      cursive: "var(--font-caveat)",
      neat: "var(--font-kalam)",
      architect: "var(--font-architects)",
    };

    const inkMap = {
      blue: "var(--ink-fountain-blue)",
      black: "var(--ink-gel-black)",
      red: "var(--ink-crimson-red)",
      green: "var(--ink-forest-green)",
    };

    return {
      "--font-handwriting": fontMap[activeFont],
      "--notebook-ink": inkMap[inkColor],
    } as React.CSSProperties;
  }, [activeFont, inkColor]);

  // --- Advanced Pagination Engine ---
  const paginate = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    // Use full A4 body height for measurement, with fallback
    const maxHeight = body.clientHeight || 780;
    
    const measureBlocks = measureRef.current?.querySelectorAll("[data-notebook-block]");
    if (!measureBlocks?.length) {
      setPages([content]);
      setReady(true);
      return;
    }

    const heights = Array.from(measureBlocks).map((el) => el.getBoundingClientRect().height);
    let pageGroups = groupBlocksIntoPages(heights, maxHeight);

    if (targetPages && targetPages > 0 && pageGroups.length > targetPages) {
      pageGroups = mergePagesToCount(pageGroups, targetPages);
    }

    const pageContents = pageGroups.map((indices) => blocksToPageContent(blocks, indices));
    const finalPages = pageContents.length > 0 ? pageContents : [content];
    
    setPages(finalPages);
    setPageIndex(0);
    setDoublePageIndex(0);
    setDirection(0);
    setReady(true);
  }, [blocks, content, targetPages, activeFont]); // Re-paginate if blocks, content, targetPages or font changes

  useLayoutEffect(() => {
    setReady(false);
    const id = requestAnimationFrame(() => paginate());
    return () => cancelAnimationFrame(id);
  }, [paginate]);

  // --- Keyboard arrow keys listener ---
  const handleNextPage = useCallback(() => {
    if (layoutMode === "double") {
      const nextDoubleIndex = doublePageIndex + 1;
      if (nextDoubleIndex * 2 < pages.length) {
        setDirection(1);
        setDoublePageIndex(nextDoubleIndex);
      }
    } else {
      const nextIndex = pageIndex + 1;
      if (nextIndex < pages.length) {
        setDirection(1);
        setPageIndex(nextIndex);
      }
    }
  }, [layoutMode, pageIndex, doublePageIndex, pages.length]);

  const handlePrevPage = useCallback(() => {
    if (layoutMode === "double") {
      const prevDoubleIndex = doublePageIndex - 1;
      if (prevDoubleIndex >= 0) {
        setDirection(-1);
        setDoublePageIndex(prevDoubleIndex);
      }
    } else {
      const prevIndex = pageIndex - 1;
      if (prevIndex >= 0) {
        setDirection(-1);
        setPageIndex(prevIndex);
      }
    }
  }, [layoutMode, pageIndex, doublePageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") handleNextPage();
      if (e.key === "ArrowLeft") handlePrevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  const totalPages = pages.length;

  // --- Double Page Index logic ---
  const leftPageContent = pages[doublePageIndex * 2];
  const rightPageContent = pages[doublePageIndex * 2 + 1];
  const totalDoublePages = Math.ceil(totalPages / 2);

  const isPrevDisabled = layoutMode === "double" ? doublePageIndex === 0 : pageIndex === 0;
  const isNextDisabled =
    layoutMode === "double"
      ? (doublePageIndex + 1) * 2 >= totalPages
      : pageIndex >= totalPages - 1;

  // --- Spiral Rings Render Helpers ---
  const renderSpiralRings = () => {
    return Array.from({ length: 14 }).map((_, i) => (
      <div
        key={i}
        className="notebook-spiral-ring"
        style={{ top: `${i * 7 + 4.5}%` }}
      />
    ));
  };

  const renderLeftSpiralRings = () => {
    return Array.from({ length: 14 }).map((_, i) => (
      <div
        key={i}
        className="notebook-left-ring"
        style={{ top: `${i * 7 + 4.5}%` }}
      />
    ));
  };

  return (
    <div className="notebook-shell w-full" style={notebookStyle}>
      {/* ─── Immersive Floating Stationery Tray (Toolbar) ─── */}
      <div className="w-full max-w-[1150px] rounded-2xl bg-card/70 border border-border/80 p-4 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4 print:hidden z-20">
        
        {/* Left Toolbar Area: Stationery Tools */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Pen / Ink Selection */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1.5 border border-border/60">
            <span className="text-xs font-semibold text-muted-foreground px-1.5 flex items-center gap-1">
              <PenTool className="h-3 w-3" /> Ink:
            </span>
            <button
              onClick={() => setInkColor("blue")}
              className={`w-6 h-6 rounded-full bg-blue-600 border transition-all ${
                inkColor === "blue" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-75 hover:opacity-100"
              }`}
              title="Fountain Royal Blue"
            />
            <button
              onClick={() => setInkColor("black")}
              className={`w-6 h-6 rounded-full bg-neutral-900 border transition-all ${
                inkColor === "black" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-75 hover:opacity-100"
              }`}
              title="Gel Ink Black"
            />
            <button
              onClick={() => setInkColor("red")}
              className={`w-6 h-6 rounded-full bg-rose-600 border transition-all ${
                inkColor === "red" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-75 hover:opacity-100"
              }`}
              title="Crimson Red Accent"
            />
            <button
              onClick={() => setInkColor("green")}
              className={`w-6 h-6 rounded-full bg-emerald-600 border transition-all ${
                inkColor === "green" ? "ring-2 ring-primary scale-110 border-white" : "border-transparent opacity-75 hover:opacity-100"
              }`}
              title="Forest Green Pen"
            />
          </div>

          {/* Typography Styles */}
          <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1 border border-border/60">
            <button
              onClick={() => setActiveFont("cursive")}
              className={`px-3 py-1 text-xs rounded-md transition-all font-semibold ${
                activeFont === "cursive" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              Cursive
            </button>
            <button
              onClick={() => setActiveFont("neat")}
              className={`px-3 py-1 text-xs rounded-md transition-all font-semibold ${
                activeFont === "neat" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              Neat
            </button>
            <button
              onClick={() => setActiveFont("architect")}
              className={`px-3 py-1 text-xs rounded-md transition-all font-semibold ${
                activeFont === "architect" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              Journal
            </button>
          </div>

          {/* Paper Styles */}
          <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1 border border-border/60">
            <button
              onClick={() => setPaperType("ruled")}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold ${
                paperType === "ruled" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
              title="Ruled Pages"
            >
              Ruled
            </button>
            <button
              onClick={() => setPaperType("grid")}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold ${
                paperType === "grid" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
              title="Grid/Graph Paper"
            >
              Grid
            </button>
            <button
              onClick={() => setPaperType("dotted")}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold ${
                paperType === "dotted" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
              title="Dotted Bullet Journal"
            >
              Dots
            </button>
            <button
              onClick={() => setPaperType("blank")}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold ${
                paperType === "blank" ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent text-muted-foreground"
              }`}
              title="Blank Journal"
            >
              Blank
            </button>
          </div>
        </div>

        {/* Center/Right Area: Utilities & Study Companion */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Study Pomodoro Timer Widget */}
          <div className="flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-lg border border-border/70 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono w-[48px] text-center">{formatTime(timerSeconds)}</span>
            <div className="flex items-center gap-1 border-l pl-2 border-border/60">
              <button
                onClick={() => setTimerActive(!timerActive)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-all"
                title={timerActive ? "Pause session" : "Start study session"}
              >
                {timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <button
                onClick={() => {
                  setTimerActive(false);
                  setTimerSeconds(0);
                }}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-all"
                title="Reset timer"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Sticky Notes & Margin Switches */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={`h-9 w-9 rounded-lg border-border/60 ${showSticky ? "bg-primary/10 border-primary text-primary" : ""}`}
              onClick={() => setShowSticky(!showSticky)}
              title="Toggle Interactive Sticky Note"
            >
              <StickyNote className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={`h-9 w-9 rounded-lg border-border/60 ${showMarginLine ? "bg-primary/10 border-primary text-primary" : ""}`}
              onClick={() => setShowMarginLine(!showMarginLine)}
              title="Toggle Margin Red Line"
            >
              <ToggleLeft className={`h-5 w-5 ${showMarginLine ? "text-primary" : "rotate-180"}`} />
            </Button>

            {/* Layout switch for large screen */}
            <div className="hidden lg:flex items-center gap-1 bg-background/50 rounded-lg p-1 border border-border/60">
              <Button
                variant={layoutMode === "single" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setLayoutMode("single")}
              >
                Single Page
              </Button>
              <Button
                variant={layoutMode === "double" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setLayoutMode("double")}
              >
                Double Page
              </Button>
            </div>

            {/* Action buttons */}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 border-border/60 flex items-center gap-1">
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>

        </div>

      </div>

      {title && (
        <header className="notebook-header print:hidden mt-2">
          <h1 className="notebook-title">{title}</h1>
          <p className="notebook-subtitle font-sans">
            Interactive notebook study session. Fully optimized for print, A4 ratios and customized handwriting styles.
          </p>
        </header>
      )}

      {/* ─── HIDDEN PAGINATION MEASURING CONTAINER ─── */}
      <div ref={measureRef} className="notebook-measure" aria-hidden>
        <article className="notebook-page notebook-page--paged">
          <div ref={bodyRef} className="notebook-page-body">
            {blocks.map((block, i) => (
              <div key={i} data-notebook-block className="notebook-block border-transparent">
                <MarkdownRenderer content={block} variant="handwriting" />
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* ─── PHYSICAL BINDER COVER CONTAINER ─── */}
      <div className="notebook-binder-container w-full relative print:border-none print:bg-transparent print:p-0 print:shadow-none">
        
        {/* Center Metal Spine Binder for Double-Page Spread */}
        {layoutMode === "double" && (
          <>
            <div className="notebook-binder-spine print:hidden" />
            <div className="absolute top-0 bottom-0 left-50% -translate-x-[50%] h-full w-12 flex flex-col justify-between py-12 pointer-events-none z-15 print:hidden">
              {renderSpiralRings()}
            </div>
          </>
        )}

        {/* Left Metal Spine Binder for Single-Page/Mobile Spread */}
        {layoutMode === "single" && (
          <>
            <div className="notebook-spiral-left print:hidden" />
            <div className="absolute top-0 bottom-0 left-[18px] h-full w-8 flex flex-col justify-between py-12 pointer-events-none z-15 print:hidden">
              {renderLeftSpiralRings()}
            </div>
          </>
        )}

        {/* ─── DYNAMIC INTERACTIVE STICKY NOTE (POST-IT) ─── */}
        {showSticky && !isNextDisabled && (
          <div className={`notebook-sticky-note ${
            stickyColor === "pink" ? "notebook-sticky-note--pink" : stickyColor === "blue" ? "notebook-sticky-note--blue" : ""
          } print:hidden group`}>
            
            {/* Sticky Color controls */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setStickyColor("yellow")} className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600" />
              <button onClick={() => setStickyColor("blue")} className="w-3 h-3 rounded-full bg-sky-400 border border-sky-600" />
              <button onClick={() => setStickyColor("pink")} className="w-3 h-3 rounded-full bg-pink-400 border border-pink-600" />
            </div>

            <textarea
              value={stickyText}
              onChange={(e) => setStickyText(e.target.value)}
              className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-xs leading-relaxed font-handwriting"
              placeholder="Jot down notes here..."
              maxLength={200}
            />
          </div>
        )}

        {/* ─── DOUBLE PAGE SPREAD ─── */}
        {layoutMode === "double" ? (
          <div className="notebook-layout-double print:grid print:grid-cols-2">
            
            {/* LEFT PAGE */}
            <article className={`notebook-page notebook-page--paged notebook-page-left paper-${paperType} ${showMarginLine ? "has-margin-line" : ""}`}>
              <div className="notebook-paper-texture" />
              
              <div className="notebook-page-number">
                {doublePageIndex * 2 + 1}
              </div>

              <div className="notebook-page-body handwriting-content">
                {ready && leftPageContent ? (
                  <MarkdownRenderer content={leftPageContent} variant="handwriting" />
                ) : (
                  <div className="flex h-full items-center justify-center font-sans text-muted-foreground">
                    Generating page view...
                  </div>
                )}
              </div>
            </article>

            {/* RIGHT PAGE */}
            <article className={`notebook-page notebook-page--paged notebook-page-right paper-${paperType} ${showMarginLine ? "has-margin-line" : ""}`}>
              <div className="notebook-paper-texture" />
              
              <div className="notebook-page-number">
                {doublePageIndex * 2 + 2}
              </div>

              <div className="notebook-page-body handwriting-content">
                {ready && rightPageContent ? (
                  <MarkdownRenderer content={rightPageContent} variant="handwriting" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center font-sans text-muted-foreground p-8 text-center">
                    {doublePageIndex * 2 + 1 >= totalPages ? (
                      <div className="space-y-2 opacity-50">
                        <BookOpenCheck className="h-8 w-8 mx-auto text-primary" />
                        <p className="font-semibold">End of Notebook</p>
                        <p className="text-xs">You have completed this customized revision set.</p>
                      </div>
                    ) : (
                      "End of Note"
                    )}
                  </div>
                )}
              </div>
            </article>

          </div>
        ) : (
          /* ─── SINGLE PAGE SPREAD ─── */
          <div className="notebook-page-viewport">
            <AnimatePresence mode="wait" custom={direction}>
              {ready && (
                <motion.article
                  key={pageIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className={`notebook-page notebook-page--paged paper-${paperType} ${showMarginLine ? "has-margin-line" : ""} pl-[var(--notebook-margin-left)]`}
                  style={{
                    // extra left pad on single page spiral
                    paddingLeft: "calc(var(--notebook-margin-left) + 2rem)"
                  }}
                  aria-label={`Page ${pageIndex + 1} of ${totalPages}`}
                >
                  <div className="notebook-paper-texture" />
                  
                  <div className="notebook-page-number">
                    {pageIndex + 1} / {totalPages}
                  </div>

                  <div className="notebook-page-body handwriting-content">
                    <MarkdownRenderer content={pages[pageIndex] || content} variant="handwriting" />
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* ─── COMPACT NAVIGATION CONTROLS ─── */}
      <div className="notebook-controls print:hidden mt-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePrevPage}
          disabled={isPrevDisabled}
          aria-label="Previous page"
          className="h-10 w-10 border-border/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="notebook-dots">
          {layoutMode === "double"
            ? Array.from({ length: totalDoublePages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`notebook-dot ${i === doublePageIndex ? "notebook-dot--active" : ""}`}
                  onClick={() => {
                    setDirection(i > doublePageIndex ? 1 : -1);
                    setDoublePageIndex(i);
                  }}
                  aria-label={`Go to double-page spread ${i + 1}`}
                />
              ))
            : pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`notebook-dot ${i === pageIndex ? "notebook-dot--active" : ""}`}
                  onClick={() => {
                    setDirection(i > pageIndex ? 1 : -1);
                    setPageIndex(i);
                  }}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={isNextDisabled}
          aria-label="Next page"
          className="h-10 w-10 border-border/80"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="notebook-hint text-center text-xs text-muted-foreground print:hidden flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        Use left/right arrows on keyboard to turn pages · Double page displays on desktops
      </p>

      {/* ─── HIDDEN PRINT LAYOUT ─── */}
      <div className="notebook-print-all hidden print:block">
        {pages.map((pageContent, i) => (
          <article
            key={i}
            className={`notebook-page notebook-page--paged paper-${paperType} ${showMarginLine ? "has-margin-line" : ""}`}
            style={{
              pageBreakAfter: "always",
              // Inline styling overrides for standard printed A4 dimensions
              width: "210mm",
              height: "297mm"
            }}
          >
            <div className="notebook-page-number">
              {i + 1}
            </div>
            <div className="notebook-page-body handwriting-content">
              <MarkdownRenderer content={pageContent} variant="handwriting" />
            </div>
          </article>
        ))}
      </div>

      <p className="notebook-footer print:hidden">
        {totalPages} handwritten page{totalPages !== 1 ? "s" : ""} · Powered by Academic Intelligence
      </p>
    </div>
  );
}
