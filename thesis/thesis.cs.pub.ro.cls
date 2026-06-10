% Mircea Bardac, 2008-2009
% dev@mircea.bardac.net
% thesis.cs.pub.ro.cls - class for thesis

% Copyright notice: you must keep the original author(s)/copyright information in the files
% Released: 2009-06-23 - v 0.1 (preview and public testing phase)

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{thesis.cs.pub.ro}[2008/07/14]

\let\ExecuteOptions@ltx\ExecuteOptions
\def\ExecuteOptions#1{%
 \ExecuteOptions@ltx{a4paper,12pt,oneside,onecolumn,final}%
}%
\LoadClassWithOptions{report}
\let\ExecuteOptions\ExecuteOptions@ltx

% Use UTF8 file encoding when writing .tex files.
% Modern LaTeX handles UTF-8 natively; the legacy ucs/utf8x combination is
% deprecated and breaks on Romanian glyphs with current TeX Live, so we rely on
% standard inputenc utf8 together with the T1 fontenc loaded further down.
\usepackage[utf8]{inputenc}
%\usepackage[english,romanian]{babel}
\usepackage[english]{babel}

\usepackage{makeidx}

% Page geometry. A4 with a slightly wider left margin to accommodate binding,
% in line with the updated SCSS formatting requirements (A4, justified body).
\usepackage[a4paper, top=3cm, bottom=3cm, left=3cm, right=2cm]{geometry}
\setlength{\headheight}{1.20cm}
\setlength{\headsep}{0.50cm}

% package for variable line spacing (1, 1.5, 2)
% usage: write \onehalfspacing before the part which should be 
% with 1.5 line spacing
% for example, in "thesis.tex" before "\input{src/main}" will make
% all the chapters with 1.5 line spacing
\usepackage{setspace}

% hyper-references
% http://www.tug.org/applications/hyperref/manual.html
\usepackage{hyperref}
\hypersetup{%
	colorlinks=true,
	linkcolor=blue,
	anchorcolor=black,
	citecolor=black,
	filecolor=blue,
	menucolor=black,
	urlcolor=blue,
	bookmarks=true,
	bookmarksnumbered=true
}
\urlstyle{sf}

% Treat _ as a normal character
\usepackage{underscore}

% Support for including graphics
\usepackage{graphicx}
\DeclareGraphicsExtensions{.pdf,.png,.jpg}

% Code listings support
\usepackage{listings}

\lstset{
	numbers=left, numberstyle=\footnotesize,
	frame=lines, captionpos=b,
	breaklines=true,
	basicstyle=\ttfamily
}

% notations and abbreviations
% http://www-h.eng.cam.ac.uk/help/tpl/textprocessing/nomencl.pdf
% Sample usage (anywhere in the doc): \abbrev{ABC}{Alpha Beta Gama}
\usepackage{nomencl}

\let\abbrev\nomenclature
\renewcommand{\nomname}{Notations and Abbreviations}

\renewcommand{\nomlabel}[1]{#1 --}
\setlength{\nomitemsep}{-\parsep}

% to be used in the main .tex file
\newcommand{\printabbrev}{
	\printnomenclature
	\newpage
}

%\makenomenclature


% restart numbering footnotes on every page
\usepackage{perpage}
\MakePerPage{footnote}

% custom variables for altering front page content

% for some reason I can't use \VAR@author as described in
% http://www.gocad.org/meeting/Nancy2008/papers/gocad.sty
\newcommand{\VARauthor} {}
\newcommand{\VARdate} {}
\newcommand{\VARadviser} {}
\newcommand{\VARtitleen} {}
\newcommand{\VARtitlero} {}
\newcommand{\VARtitlefooteren} {}
\newcommand{\VARtitlefooterro} {}

\renewcommand{\author}[1]{ \renewcommand{\VARauthor}{#1} }
\renewcommand{\date}[1]{ \renewcommand{\VARdate}{#1} }
\newcommand{\adviser}[1]{ \renewcommand{\VARadviser}{#1} }
\newcommand{\titleen}[1]{ \renewcommand{\VARtitleen}{#1} }
\newcommand{\titlero}[1]{ \renewcommand{\VARtitlero}{#1} }
\newcommand{\titlefooteren}[1]{ \renewcommand{\VARtitlefooteren}{#1} }
\newcommand{\titlefooterro}[1]{ \renewcommand{\VARtitlefooterro}{#1} }


% fancyhdr package
% headers with chapter title and page number
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{} % delete default settings
\fancyhead[L,RO]{\bfseries \thepage} % page number
\fancyhead[L]{\bfseries\leftmark}    % section name

% line in header
\renewcommand{\headrulewidth}{0.5pt}
% more space for the line in header
\addtolength{\headheight}{0.5pt}

% no line in footer
\renewcommand{\footrulewidth}{0pt}

% longtable package
\usepackage{longtable}

% Fix verbatim environment: smaller text size
\let\oldverbatim=\verbatim
\renewenvironment{verbatim}{
  \begin{small}
  \begin{oldverbatim}
  \vspace*{1em}
}%
{%
  \vspace*{1em}
  \end{oldverbatim}
  \end{small}
}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% iiscthes.sty - IISC Thesis Style
% http://etd.ncsi.iisc.ernet.in/instructions/templates.htm

% Page formatting and numbering

\newenvironment{frontmatter}{\pagenumbering{roman}}{\newpage \pagenumbering{arabic}}

\renewenvironment{abstract}{\null\vfil\prefacesection{Abstract}}{\par\vfill\null}

\def\prefacesection#1{%
	\chapter*{#1}
	\addcontentsline{toc}{chapter}{#1}}

% Added by Y.N. Srikant
\def\keywords{\prefacesection{Keywords}}
\def\notations{\prefacesection{Notation and Abbreviations}}
\def\vita{\prefacesection{Vita}}
\def\publications{\prefacesection{Publications based on this Thesis}}

%% end iiscthes.sty
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\def\notitlesection#1{%
    \addcontentsline{toc}{chapter}{#1}}

\newenvironment{acknowledgements} {
    \notitlesection{Acknowledgements}
    \thispagestyle{empty} }
{\pagestyle{fancy}}

\newcommand{\includechapter}[1]{\input{src/chapter-#1/index}}
\newcommand{\includesection}[2]{\input{src/chapter-#1/#2}}

% Justified body text with a first-line indent (classic thesis style), as in the
% updated SCSS formatting requirements (1.25 cm indent, no inter-paragraph skip).
\setlength{\parindent}{1.25cm}
\setlength{\parskip}{0pt}
\usepackage{indentfirst}

\usepackage[T1]{fontenc}

% Default fonts: Times New Roman-compatible text and math (mathptmx), with
% Helvetica for sans-serif and Courier for typewriter, matching the requested
% "Times New Roman, 12 pt" body font.
\usepackage{mathptmx}
\usepackage[scaled=0.92]{helvet}
\usepackage{courier}

% Subtle micro-typography (character protrusion / font expansion).
\usepackage{microtype}

% SF font: Helvetica (default document font)
%\usepackage[scaled]{helvet}
%\renewcommand*\familydefault{\sfdefault}

% command for specifying TODOs
\newcommand{\todo}[1]{
	\colorbox{yellow}{
		\begin{minipage}{15cm}
			\textbf{TODO:}\\
			#1
		\end{minipage}
	}
}

% command for formatting inline functions
% Usage (default language = C)
%   \func{function_name}
%   \func[language]{function_name}
%      'language' must be supported by package 'listings'
\newcommand{\func}[2][C]{\lstset{language=#1}\lstinline|#2|\lstset{language=C}}

% command for formatting file names
\newcommand{\file}[1]{\textbf{\texttt{#1}}}

% command for formatting inline commands
\newcommand{\cmd}[1]{\textbf{\texttt{#1}}}

% commands for creating labeled hyper-linked references
\newcommand{\labelindexref}[2]{\hyperref[#2]{#1~\ref*{#2}}}
\newcommand{\labelref}[2]{\hyperref[#2]{#1}}

% command for inserting labeled figures
% Usage: \fig{file}{label}{caption}
%   TODO: references should point to the top of the image
\newcommand{\fig}[4][]{
\begin{figure}[htb]
	\begin{center}
		\includegraphics[#1]{#2}
		\caption{#4 \label{#3}}
    \end{center}
\end{figure}
}
% suport for multiple columns
\usepackage{multicol}

% Caption formatting (updated SCSS requirements): 11 pt captions, figure
% captions centred below the figure, table captions centred above the table.
\usepackage{caption}
\DeclareCaptionFont{captioneleven}{\fontsize{11pt}{13pt}\selectfont}
\captionsetup[figure]{font=captioneleven,labelsep=colon,justification=centering,position=bottom}
\captionsetup[table]{font=captioneleven,labelsep=colon,justification=centering,position=top}

% suport for subfloats
\usepackage{subfig}

% booktabs (professional tables)
\usepackage{booktabs}

% multirow (useful for creating multirow cells)
\usepackage{multirow}

% mathematical formulas
\usepackage{amsmath}

% =====================================================================
% Diagrams (TikZ) and source-code listings
% =====================================================================

% TikZ for architecture / flow / state diagrams drawn directly in LaTeX.
\usepackage{tikz}
\usetikzlibrary{arrows.meta, positioning, shapes.geometric, calc, fit, backgrounds, decorations.pathreplacing}

% Colour palette reused across listings and diagrams.
\definecolor{zkwbg}{RGB}{247,248,250}
\definecolor{zkwkeyword}{RGB}{0,90,156}
\definecolor{zkwcomment}{RGB}{106,115,125}
\definecolor{zkwstring}{RGB}{163,21,69}
\definecolor{zkwline}{RGB}{150,150,150}
\definecolor{zkwframe}{RGB}{210,214,220}
\definecolor{zkwaccent}{RGB}{0,90,156}
\definecolor{zkwsoft}{RGB}{225,235,245}

% A clean, readable default style for code listings.
\lstdefinestyle{zkw}{
  backgroundcolor=\color{zkwbg},
  basicstyle=\ttfamily\footnotesize,
  keywordstyle=\color{zkwkeyword}\bfseries,
  commentstyle=\color{zkwcomment}\itshape,
  stringstyle=\color{zkwstring},
  numberstyle=\tiny\color{zkwline},
  numbers=left,
  numbersep=8pt,
  stepnumber=1,
  frame=single,
  rulecolor=\color{zkwframe},
  framesep=5pt,
  breaklines=true,
  breakatwhitespace=true,
  showstringspaces=false,
  tabsize=2,
  captionpos=b,
  xleftmargin=14pt,
  aboveskip=1.0em,
  belowskip=1.0em,
}

% Solidity is not a built-in listings language; define a reasonable subset.
\lstdefinelanguage{Solidity}{
  keywords={pragma, solidity, contract, interface, library, function, modifier,
    constructor, event, emit, struct, enum, mapping, address, payable, public,
    private, external, internal, view, pure, returns, return, memory, storage,
    calldata, require, revert, if, else, for, while, bool, uint256, uint32,
    bytes32, bytes, string, immutable, constant, indexed, msg, block, this,
    import, using, is, override, virtual, true, false, new},
  keywordstyle=\color{zkwkeyword}\bfseries,
  morecomment=[l]{//},
  morecomment=[s]{/*}{*/},
  morestring=[b]",
  sensitive=true,
}

% TypeScript subset for client-side listings.
\lstdefinelanguage{TypeScript}{
  keywords={abstract, async, await, as, break, case, catch, class, const,
    continue, default, delete, do, else, enum, export, extends, false, finally,
    for, from, function, if, implements, import, in, instanceof, interface, let,
    new, null, of, private, protected, public, readonly, return, static, super,
    switch, this, throw, true, try, type, typeof, undefined, void, while, yield},
  keywordstyle=\color{zkwkeyword}\bfseries,
  morecomment=[l]{//},
  morecomment=[s]{/*}{*/},
  morestring=[b]",
  morestring=[b]',
  morestring=[b]`,
  sensitive=true,
}

\lstset{style=zkw}

% Rename the listings float to "Listing" and add it to the lists.
\renewcommand{\lstlistingname}{Listing}
