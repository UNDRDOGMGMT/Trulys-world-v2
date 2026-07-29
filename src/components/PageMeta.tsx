import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  path?: string;
}

/**
 * Lean document-head manager — sets <title> + meta description without pulling
 * in react-helmet. Enough for a fan site; swap for helmet if SSR/OG matters.
 */
const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
    return () => {
      document.title = prev;
    };
  }, [title, description]);

  return null;
};

export default PageMeta;
