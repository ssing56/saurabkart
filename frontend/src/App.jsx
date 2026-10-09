
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const categories = [
  "All",
  "Electronics",
  "Mobiles",
  "Fashion",
  "Accessories",
  "Home",
  "Beauty",
  "Sports",
  "Books",
];

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function ProductImage({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  const categoryIcons = {
    Electronics: "💻",
    Mobiles: "📱",
    Fashion: "👕",
    Accessories: "⌚",
    Home: "🏠",
    Beauty: "✨",
    Sports: "⚽",
    Books: "📚",
  };

  if (!product.image || imageFailed) {
    return (
      <div className="product-image product-image-fallback">
        <span>{categoryIcons[product.category] || "🛍️"}</span>
      </div>
    );
  }

  return (
    <div className="product-image">
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/products`);

        if (!response.ok) {
          throw new Error(`Products API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid products response from server");
        }

        if (active) {
          setProducts(data);
        }
      } catch (err) {
        if (active) {
          setError(
            "Products load nahi ho paaye. Please internet aur backend check karein."
          );
          console.error("Products loading error:", err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch =
        selectedCategory === "All" ||
        String(product.category || "").toLowerCase() ===
          selectedCategory.toLowerCase();

      const searchMatch =
        !searchText ||
        [
          product.name,
          product.description,
          product.category,
        ].some((value) =>
          String(value || "").toLowerCase().includes(searchText)
        );

      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategory, search]);

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  function addToCart(product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item._id === product._id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          price: Number(product.price) || 0,
          quantity: 1,
        },
      ];
    });

    setNotice(`${product.name} cart mein add ho gaya.`);
  }

  function changeQuantity(productId, change) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item._id !== productId)
    );
  }

  function handleCheckout() {
    if (cart.length === 0) {
      setNotice("Checkout se pehle cart mein products add karein.");
      return;
    }

    setNotice(
      "Cart ready hai. Online payment aur order placement abhi integrate nahi hain."
    );
  }

  return (
    <div className="app">
      <header className="top-header">
        <a
          className="brand"
          href="#home"
          onClick={() => {
            setSelectedCategory("All");
            setSearch("");
          }}
        >
          <span className="brand-icon">🛍️</span>
          <span>
            Saurab<span className="brand-highlight">Kart</span>
          </span>
        </a>

        <div className="header-search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, brands and more..."
            aria-label="Search products"
          />
          <button
            type="button"
            className="search-button"
            aria-label="Search"
          >
            🔍
          </button>
        </div>

        <a className="cart-link" href="#cart">
          🛒 Cart <span className="cart-count">{cartCount}</span>
        </a>
      </header>

      <nav className="category-nav" aria-label="Product categories">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={
              selectedCategory === category
                ? "category-button active"
                : "category-button"
            }
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <main id="home">
        <section className="hero">
          <div className="hero-content">
            <span className="hero-tag">WELCOME TO SAURABKART</span>
            <h1>Everything You Love, All in One Place.</h1>
            <p>
              Electronics se lekar fashion, home essentials aur books tak
              — apni pasand ke products ek hi jagah explore karein.
            </p>
            <button
              type="button"
              className="hero-button"
              onClick={() => {
                setSelectedCategory("All");
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Shop Now →
            </button>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span>🎧</span>
            <span>👟</span>
            <span>📱</span>
            <span>⌚</span>
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">OUR COLLECTION</p>
              <h2>
                {selectedCategory === "All"
                  ? "Explore Products"
                  : selectedCategory}
              </h2>
              <p className="product-count">
                {loading
                  ? "Products load ho rahe hain..."
                  : `${filteredProducts.length} products found`}
              </p>
            </div>

            <select
              aria-label="Filter by category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <span className="loading-spinner" />
              <p>Products load ho rahe hain...</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button
                type="button"
                className="add-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-state">
              <span>🔎</span>
              <h3>No products found</h3>
              <p>Search badlein ya doosri category select karein.</p>
              <button
                type="button"
                className="add-button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                }}
              >
                Show All Products
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="products">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product._id}>
                  <ProductImage product={product} />

                  <div className="product-info">
                    <span className="product-category">
                      {product.category || "Other"}
                    </span>

                    <h3>{product.name}</h3>

                    <p className="product-description">
                      {product.description || "Quality product from SaurabKart."}
                    </p>

                    <div className="product-price">
                      {formatPrice(product.price)}
                    </div>

                    <button
                      type="button"
                      className="add-button"
                      onClick={() => addToCart(product)}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="cart-section" id="cart">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">YOUR SELECTION</p>
              <h2>Your Shopping Cart ({cartCount})</h2>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <span>🛒</span>
              <p>Your cart is empty. Add products to get started!</p>
            </div>
          ) : (
            <div className="cart-content">
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item._id}>
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <span>{formatPrice(item.price)} each</span>
                    </div>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item._id, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item._id, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        +
                      </button>
                    </div>

                    <strong className="cart-item-total">
                      {formatPrice(item.price * item.quantity)}
                    </strong>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeFromCart(item._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <h3>Order Summary</h3>
                <div className="summary-row">
                  <span>Items ({cartCount})</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="summary-total">
                  <span>Subtotal</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                <button
                  type="button"
                  className="checkout-button"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout →
                </button>
                <p className="checkout-note">
                  Online payment is not enabled yet.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home">
          SaurabKart
        </a>
        <p>
          Your everyday shopping destination.
        </p>
        <p>© {new Date().getFullYear()} SaurabKart. All rights reserved.</p>
      </footer>
    </div>
  );
}
