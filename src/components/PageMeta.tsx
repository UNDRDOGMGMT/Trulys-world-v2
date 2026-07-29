import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  path?: string;
}

function ensureMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Lean document-head manager — title, description, and matching OG tags
 * without react-helmet.
 */
const PageMeta: React.FC<PageMetaProps> = ({ title, description, path }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    ensureMeta("property", "og:title", title);
    if (description) {
      ensureMeta("name", "description", description);
      ensureMeta("property", "og:description", description);
    }
    if (path) {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://trulys.world";
      ensureMeta("property", "og:url", `${origin}${path.startsWith("/") ? path : `/${path}`}`);
    }
    return () => {
      document.title = prev;
    };
  }, [title, description, path]);

  return null;
};

export default PageMeta;
