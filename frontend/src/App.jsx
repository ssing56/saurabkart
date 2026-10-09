import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const categories = [
  { name: "All", icon: "✦" },
  { name: "Electronics", icon: "💻" },
  { name: "Mobiles", icon: "📱" },
  { name: "Fashion", icon: "👕" },
  { name: "Accessories", icon: "⌚" },
  { name: "Home", icon: "🏠" },
  { name: "Beauty", icon: "✨" },
  { name: "Sports", icon: "⚽" },
  { name: "Books", icon: "📚" },
];

const categoryColors = {
  Electronics: "blue",
  Mobiles: "violet",
  Fashion: "pink",
  Accessories: "amber",
  Home: "green",
  Beauty: "rose",
  Sports: "orange",
  Books: "cyan",
};

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

async function readResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "Server se valid JSON response nahi mila. Backend API aur deployment check karein."
    );
  }
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const scriptUrl = "https://checkout.razorpay.com/v1/checkout.js";
    let script = document.querySelector(`script[src="${scriptUrl}"]`);

    if (script) {
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => resolve(false), { once: true });

      if (window.Razorpay) resolve(true);
      return;
    }

    script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);

  const icons = {
    Electronics: "💻",
    Mobiles: "📱",
    Fashion: "👕",
    Accessories: "⌚",
    Home: "🏠",
    Beauty: "✨",
    Sports: "⚽",
    Books: "📚",
  };

  useEffect(() => {
    setFailed(false);
  }, [product.image]);

  return (
    <div
      className={`product-photo ${
        failed || !product.image ? "product-photo-fallback" : ""
      }`}
    >
      {product.image && !failed ? (
        <img
          src={product.image}
          alt={product.name || "SaurabKart product"}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="fallback-emoji">
          {icons[product.category] || "🛍️"}
        </span>
      )}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  if (!message) return null;

  return (
    <div className={`toast toast-${type || "info"}`} role="status">
      <span className="toast-icon">
        {type === "success" ? "✓" : type === "error" ? "!" : "i"}
      </span>
      <span>{message}</span>
      <button
        className="toast-close"
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const getViewFromHash = () => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes("payment-success")) return "success";
    if (hash.includes("cart")) return "cart";
    return "home";
  };

  const [view, setView] = useState(getViewFromHash);

  useEffect(() => {
    const updateView = () => {
      setView(getViewFromHash());
    };

    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

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

        const data = await readResponse(response);

        if (!Array.isArray(data)) {
          throw new Error("Products API ka response invalid hai.");
        }

        if (active) setProducts(data);
      } catch (err) {
        console.error("Products loading error:", err);
        if (active) {
          setError(
            "Products load nahi ho paaye. Internet connection aur backend API check karein."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatches =
        selectedCategory === "All" ||
        String(product.category || "").toLowerCase() ===
          selectedCategory.toLowerCase();

      const searchMatches =
        !query ||
        [product.name, product.description, product.category].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      return categoryMatches && searchMatches;
    });
  }, [products, selectedCategory, search]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  function notify(message, type = "info") {
    setNotice(message);
    setNoticeType(type);
  }

  function openCart() {
    window.location.hash = "/cart";
    setView("cart");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    window.location.hash = "/";
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectCategory(category) {
    setSelectedCategory(category);
    setView("home");

    if (window.location.hash !== "#/") {
      window.location.hash = "/";
    }
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);

      if (existing) {
        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          price: Number(product.price) || 0,
          quantity: 1,
        },
      ];
    });

    notify(`${product.name} cart mein add ho gaya.`, "success");
  }

  function changeQuantity(productId, change) {
    setCart((current) =>
      current
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter((item) => item._id !== productId)
    );
    notify("Product cart se remove kar diya gaya.", "info");
  }

  async function handleCheckout() {
    if (checkoutLoading) return;

    if (cart.length === 0) {
      notify("Checkout se pehle cart mein products add karein.", "error");
      return;
    }

    setCheckoutLoading(true);
    setNotice("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Razorpay checkout load nahi hua. Internet connection check karein."
        );
      }

      const orderResponse = await fetch(
        `${API_URL}/api/payment/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item._id,
              quantity: item.quantity,
            })),
          }),
        }
      );

      const orderData = await readResponse(orderResponse);

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message || "Payment order create nahi hua."
        );
      }

      if (!orderData.orderId || !orderData.keyId || !orderData.amount) {
        throw new Error(
          "Backend ne incomplete payment order return kiya."
        );
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "SaurabKart",
        description: "Your everyday shopping destination",
        order_id: orderData.orderId,
        image: "/favicon.ico",
        theme: { color: "#2457e6" },

        prefill: {},
        notes: { source: "SaurabKart website" },

        handler: async function (paymentResponse) {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/payment/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              }
            );

            const verifyData = await readResponse(verifyResponse);

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || "Payment verification failed."
              );
            }

            setCart([]);
            setView("success");
            window.location.hash = "/payment-success";
            notify(
              "Payment verify ho gayi! Aapka order successful hai.",
              "success"
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (verifyError) {
            console.error("Payment verification error:", verifyError);
            notify(
              "Payment response mil gaya, lekin verification confirm nahi hui. Dobara payment karne se pehle order status verify karein.",
              "error"
            );
          } finally {
            setCheckoutLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
            notify(
              "Checkout close ho gaya. Payment successful hui ho sakti hai; retry se pehle status verify karein.",
              "info"
            );
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        setCheckoutLoading(false);
        notify(
          response.error?.description ||
            "Payment complete nahi hui. Test mode mein dobara try karein.",
          "error"
        );
      });

      checkout.open();
    } catch (err) {
      console.error("Checkout error:", err);
      notify(err.message || "Checkout start nahi ho saka.", "error");
      setCheckoutLoading(false);
    }
  }

  function scrollToProducts() {
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <div className="app-shell">
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span>✨ Everyday essentials, all in one place</span>
          <span className="announcement-right">
            <span>Secure checkout</span>
            <span className="announcement-dot">•</span>
            <span>Razorpay Test Mode</span>
          </span>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <button className="brand" type="button" onClick={goHome}>
            <span className="brand-mark">S</span>
            <span className="brand-name">
              Saurab<span>Kart</span>
            </span>
          </button>

          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              goHome();
              scrollToProducts();
            }}
          >
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              aria-label="Search products"
              type="search"
              placeholder="Search products, brands and more..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button type="submit" className="search-button">
              Search
            </button>
          </form>

          <div className="header-actions">
            <div className="trust-label">
              <span className="trust-check">✓</span>
              <span>Shop with confidence</span>
            </div>
            <button className="cart-button" type="button" onClick={openCart}>
              <span className="cart-icon">🛒</span>
              <span>Cart</span>
              <span className="cart-badge">{cartCount}</span>
            </button>
          </div>
        </div>

        <nav className="category-nav" aria-label="Product categories">
          <div className="container category-nav-inner">
            {categories.map((category) => (
              <button
                type="button"
                key={category.name}
                className={`category-link ${
                  selectedCategory === category.name ? "active" : ""
                }`}
                onClick={() => selectCategory(category.name)}
              >
                <span className="category-nav-icon">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main>
        {view === "cart" ? (
          <section className="container cart-page">
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR SELECTION</span>
                <h1>Your shopping cart</h1>
                <p>Review your items before checking out.</p>
              </div>
              <button className="text-button" type="button" onClick={goHome}>
                ← Continue shopping
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛍️</div>
                <h2>Your cart is waiting for something lovely</h2>
                <p>Explore the collection and add your favourite products.</p>
                <button className="primary-button" onClick={goHome}>
                  Explore products <span>→</span>
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-items-panel">
                  <div className="panel-heading">
                    <h2>Cart items</h2>
                    <span>{cartCount} item(s)</span>
                  </div>

                  {cart.map((item) => (
                    <article className="cart-item" key={item._id}>
                      <div className="cart-item-image">
                        <ProductImage product={item} />
                      </div>
                      <div className="cart-item-info">
                        <span className="product-category">
                          {item.category || "Everyday essentials"}
                        </span>
                        <h3>{item.name}</h3>
                        <p className="cart-item-price">
                          {formatPrice(item.price)}
                        </p>
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeFromCart(item._id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="cart-item-right">
                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item._id, -1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item._id, 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <strong>
                          {formatPrice(item.price * item.quantity)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>

                <aside className="order-summary">
                  <h2>Order summary</h2>
                  <div className="summary-row">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Delivery</span>
                    <span className="free-delivery">Calculated at checkout</span>
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-total">
                    <span>Total</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                  <button
                    className="primary-button checkout-button"
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="button-spinner" />
                        Preparing checkout...
                      </>
                    ) : (
                      <>
                        Pay securely with Razorpay <span>→</span>
                      </>
                    )}
                  </button>
                  <div className="secure-note">
                    <span>🔒</span>
                    <span>Secure payment powered by Razorpay</span>
                  </div>
                  <div className="test-mode-note">
                    Test Mode checkout
                  </div>
                </aside>
              </div>
            )}
          </section>
        ) : view === "success" ? (
          <section className="container success-page">
            <div className="success-card">
              <div className="success-check">✓</div>
              <span className="eyebrow">PAYMENT CONFIRMED</span>
              <h1>Thank you for your order!</h1>
              <p>
                Your payment has been verified. Thanks for shopping with
                SaurabKart.
              </p>
              <button className="primary-button" onClick={goHome}>
                Continue shopping <span>→</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="container hero-section">
              <div className="hero-copy">
                <span className="eyebrow hero-eyebrow">
                  WELCOME TO SAURABKART
                </span>
                <h1>
                  Everything you love,
                  <br />
                  <span>all in one place.</span>
                </h1>
                <p>
                  From everyday essentials to little luxuries, discover
                  products that make life better.
                </p>
                <div className="hero-actions">
                  <button
                    className="primary-button hero-button"
                    onClick={scrollToProducts}
                  >
                    Explore collection <span>→</span>
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => selectCategory("Electronics")}
                  >
                    Shop electronics
                  </button>
                </div>
                <div className="hero-benefits">
                  <span>
                    <b>✓</b> Easy shopping
                  </span>
                  <span>
                    <b>✓</b> Secure checkout
                  </span>
                </div>
              </div>

              <div className="hero-art" aria-label="Shopping categories">
                <div className="hero-orbit orbit-one" />
                <div className="hero-orbit orbit-two" />
                <div className="hero-art-card hero-art-card-main">
                  <span className="hero-art-emoji">🛍️</span>
                  <div>
                    <span className="hero-art-label">YOUR EVERYDAY</span>
                    <strong>Shopping, simplified.</strong>
                  </div>
                </div>
                <div className="floating-product floating-laptop">💻</div>
                <div className="floating-product floating-fashion">👟</div>
                <div className="floating-product floating-phone">📱</div>
                <div className="floating-product floating-home">🏡</div>
                <div className="hero-art-tag">
                  <span className="tag-sparkle">✦</span>
                  Find your favourites
                </div>
              </div>

              <div className="hero-bottom-shape" />
            </section>

            <section className="container benefits-strip">
              <div className="benefit-item">
                <span className="benefit-icon">🚚</span>
                <div>
                  <strong>Convenient shopping</strong>
                  <span>Browse all in one place</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔒</span>
                <div>
                  <strong>Secure checkout</strong>
                  <span>Payment powered by Razorpay</span>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💫</span>
                <div>
                  <strong>Made for you</strong>
                  <span>Explore products you love</span>
                </div>
              </div>
            </section>

            <section className="container categories-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">FIND YOUR FAVOURITES</span>
                  <h2>Shop by category</h2>
                </div>
                <span className="section-side-note">A little something for everyone</span>
              </div>

              <div className="category-tiles">
                {categories
                  .filter((category) => category.name !== "All")
                  .map((category) => (
                    <button
                      className={`category-tile tile-${(
                        categoryColors[category.name] || "blue"
                      )} ${
                        selectedCategory === category.name ? "selected" : ""
                      }`}
                      key={category.name}
                      type="button"
                      onClick={() => {
                        selectCategory(category.name);
                        scrollToProducts();
                      }}
                    >
                      <span className="category-tile-icon">
                        {category.icon}
                      </span>
                      <span>{category.name}</span>
                      <span className="tile-arrow">↗</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="container products-section" id="products">
              <div className="section-heading products-heading">
                <div>
                  <span className="eyebrow">OUR COLLECTION</span>
                  <h2>
                    {search.trim()
                      ? "Search results"
                      : selectedCategory === "All"
                      ? "Explore products"
                      : selectedCategory}
                  </h2>
                  <p>
                    {search.trim()
                      ? `Results for "${search.trim()}"`
                      : "Discover something you'll love."}
                  </p>
                </div>
                <div className="product-count">
                  {loading
                    ? "Loading..."
                    : `${filteredProducts.length} products`}
                </div>
              </div>

              {error && (
                <div className="error-banner">
                  <span>⚠️</span>
                  <div>
                    <strong>Unable to load products</strong>
                    <p>{error}</p>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => window.location.reload()}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="product-grid">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div className="skeleton-card" key={index}>
                      <div className="skeleton-image" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line short" />
                      <div className="skeleton-line price-line" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state compact-empty">
                  <div className="empty-icon">🔎</div>
                  <h2>No products found</h2>
                  <p>Try a different search or choose another category.</p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory("All");
                    }}
                  >
                    Show all products
                  </button>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <article className="product-card" key={product._id}>
                      <div className="product-card-image-wrap">
                        <ProductImage product={product} />
                        <span className="product-badge">JUST FOR YOU</span>
                        <button
                          className="quick-add"
                          type="button"
                          onClick={() => addToCart(product)}
                          aria-label={`Add ${product.name} to cart`}
                        >
                          +
                        </button>
                      </div>
                      <div className="product-card-content">
                        <span className="product-category">
                          {product.category || "Everyday essentials"}
                        </span>
                        <h3 title={product.name}>{product.name}</h3>
                        <p className="product-description">
                          {product.description ||
                            "A great addition to your everyday collection."}
                        </p>
                        <div className="product-card-bottom">
                          <strong className="product-price">
                            {formatPrice(product.price)}
                          </strong>
                          <button
                            className="add-to-cart-button"
                            type="button"
                            onClick={() => addToCart(product)}
                          >
                            Add to cart <span>+</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="container bottom-promo">
              <div className="promo-icon">✦</div>
              <div>
                <span className="eyebrow">YOUR NEXT FAVOURITE IS HERE</span>
                <h2>Good finds. Easy shopping.</h2>
                <p>Explore the collection and find something just right for you.</p>
              </div>
              <button className="primary-button" onClick={scrollToProducts}>
                Browse products <span>→</span>
              </button>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-main">
          <button className="brand footer-brand" onClick={goHome} type="button">
            <span className="brand-mark">S</span>
            <span className="brand-name">
              Saurab<span>Kart</span>
            </span>
          </button>
          <p>Your everyday shopping destination.</p>
          <div className="footer-links">
            <button type="button" onClick={goHome}>Home</button>
            <button type="button" onClick={openCart}>Shopping cart</button>
            <button type="button" onClick={() => selectCategory("Electronics")}>
              Electronics
            </button>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} SaurabKart. All rights reserved.</span>
          <span>Secure checkout powered by Razorpay</span>
        </div>
      </footer>

      <Toast
        message={notice}
        type={noticeType}
        onClose={() => setNotice("")}
      />
    </div>
  );
}
