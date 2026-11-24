import { useEffect } from 'react'

// Sets title / meta / OG tags per page and injects Product JSON-LD when given.
export default function SEO({ title, description, product, image }) {
  useEffect(() => {
    document.title = title ? `${title} | SP Marketplace` : 'SP Marketplace — বাংলাদেশের অনলাইন শপিং'
    const setMeta = (attr, name, content) => {
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    if (description) { setMeta('name', 'description', description); setMeta('property', 'og:description', description) }
    setMeta('property', 'og:title', document.title)
    if (image) setMeta('property', 'og:image', image)
    let ld = document.getElementById('sp-jsonld')
    if (product) {
      if (!ld) { ld = document.createElement('script'); ld.id = 'sp-jsonld'; ld.type = 'application/ld+json'; document.head.appendChild(ld) }
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Product', name: product.name,
        description: product.description, image: product.images,
        offers: { '@type': 'Offer', priceCurrency: 'BDT', price: product.price, availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
      })
    } else if (ld) ld.remove()
  }, [title, description, product, image])
  return null
}
