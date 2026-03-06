import { Helmet } from 'react-helmet-async';

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}

const BASE_URL = 'https://douknowball.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const PageSeo = ({ title, description, path, ogImage }: PageSeoProps) => {
  const canonicalUrl = `${BASE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default PageSeo;
