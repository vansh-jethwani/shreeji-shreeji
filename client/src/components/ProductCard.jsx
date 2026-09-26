import { useState } from 'react'
import { formatINR } from '../utils/upi.js'
import { SHOP_NOTES, BESTSELLERS } from '../utils/shopVoice.js'

/**
 * Product selection card. Numbered like a menu, with a shopkeeper's one-liner
 * under the description, a rotated Bestseller stamp for a few favourites,
 * and a slightly alternating tint so the grid feels laid out by hand.
 * Shows image (from the product record, wired to /images/products/<slug>.jpg
 * by the backend seed), name, weight, price and a Select button. If the image
 * is missing or fails to load, an elegant champagne-gold monogram fallback
 * is shown.
 */
export default function ProductCard({ product, selected, onSelect, disabled, index = 0 }) {
  const [imgError, setImgError] = useState(false)
  const unavailable = !product.available
  const initial = (product.name || 'S').trim().charAt(0).toUpperCase()
  const note = SHOP_NOTES[product.name]
  const isBestseller = BESTSELLERS.has(product.slug)
  const number = String(index + 1).padStart(2, '0')

  return (
    <article
      className={`product-card ${selected ? 'selected' : ''} ${
        index % 2 === 1 ? 'tint-warm' : ''
      }`}
      aria-pressed={selected}
    >
      <div className="product-img-wrap">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-img-fallback" role="img" aria-label={product.name}>
            <span aria-hidden="true">{initial}</span>
          </div>
        )}
        <span className="product-num" aria-hidden="true">
          No. {number}
        </span>
        {isBestseller && (
          <span className="bestseller-stamp" aria-label="Bestseller">
            Bestseller
          </span>
        )}
        {selected && (
          <span className="selected-check" aria-label="Selected">
            ✓
          </span>
        )}
        {unavailable && <span className="out-of-stock-badge">Out of stock</span>}
      </div>
      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        {product.description && <p className="product-desc">{product.description}</p>}
        {note && <p className="shop-note">{note}</p>}
        <div className="product-meta">
          {product.weight && <span className="product-weight">{product.weight}</span>}
          <span className="product-price">{formatINR(product.price)}</span>
        </div>
        <button
          type="button"
          className="select-btn"
          disabled={disabled || unavailable}
          onClick={() => onSelect(product)}
          aria-label={selected ? `Selected: ${product.name}` : `Select ${product.name}`}
        >
          {unavailable ? 'Out of Stock' : selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </article>
  )
}

/** Loading placeholder for the product grid. */
export function ProductCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton" style={{ height: 18, width: '70%' }} />
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
        <div className="skeleton" style={{ height: 44 }} />
      </div>
    </div>
  )
}
