'use client';

/**
 * QURI Protocol - Home Page
 * Clean, modular, scalable landing page
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Coins,
  Search,
  ArrowLeftRight,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { fadeInUp, staggerContainer, staggerItem } from '@/design-system/motion/presets';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-gold-200/30 to-gold-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-200/20 to-purple-300/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={staggerItem} className="inline-block mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold-50 border border-gold-200 rounded-full text-sm font-medium text-gold-700">
                <Sparkles className="h-4 w-4" />
                Native Bitcoin Runes on Internet Computer
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={staggerItem}
              className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-museum-black mb-6 leading-tight"
            >
              Bitcoin Runes
              <br />
              <span className="bg-gradient-to-r from-gold-500 to-gold-700 bg-clip-text text-transparent">
                Made Simple
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={staggerItem}
              className="text-xl text-museum-dark-gray max-w-2xl mx-auto mb-10"
            >
              Create, manage, and bridge Bitcoin Runes using the security of Internet Computer
              and the power of Chain Key Technology
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/dashboard">
                <ButtonPremium
                  variant="gold"
                  size="lg"
                  icon={<Sparkles className="h-5 w-5" />}
                >
                  Launch App
                </ButtonPremium>
              </Link>
              <Link href="/explorer">
                <ButtonPremium
                  variant="secondary"
                  size="lg"
                  icon={<Search className="h-5 w-5" />}
                >
                  Explore Runes
                </ButtonPremium>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-museum-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Section Header */}
            <motion.div variants={staggerItem} className="text-center mb-16">
              <h2 className="font-serif text-4xl font-bold text-museum-black mb-4">
                Why QURI Protocol?
              </h2>
              <p className="text-lg text-museum-dark-gray max-w-2xl mx-auto">
                The most secure and user-friendly way to work with Bitcoin Runes
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Shield,
                  title: 'Secure by Design',
                  description: 'Built on Internet Computer with Chain Key cryptography',
                  color: 'blue',
                },
                {
                  icon: Zap,
                  title: 'Fast & Efficient',
                  description: 'Lightning-fast transactions with minimal fees',
                  color: 'purple',
                },
                {
                  icon: Globe,
                  title: 'Fully On-Chain',
                  description: 'Everything runs on-chain, no centralized servers',
                  color: 'green',
                },
                {
                  icon: Coins,
                  title: 'Native Bitcoin',
                  description: 'Real Bitcoin Runes, not synthetic tokens',
                  color: 'gold',
                },
              ].map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={staggerItem}
                  className="group p-6 bg-museum-white border border-museum-light-gray rounded-xl hover:shadow-xl transition-all cursor-default"
                  whileHover={{ y: -4 }}
                >
                  <div className={`inline-flex p-3 bg-${feature.color}-50 rounded-lg mb-4`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-xl text-museum-black mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-museum-dark-gray">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={staggerItem}
              className="font-serif text-4xl font-bold text-museum-black text-center mb-12"
            >
              Get Started in Minutes
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  href: '/create',
                  icon: Sparkles,
                  title: 'Create a Rune',
                  description: 'Etch your own Bitcoin Rune in just a few clicks',
                  gradient: 'from-gold-50 to-gold-100',
                  iconColor: 'text-gold-600',
                },
                {
                  href: '/bridge',
                  icon: ArrowLeftRight,
                  title: 'Bridge Assets',
                  description: 'Move Bitcoin and Runes between chains securely',
                  gradient: 'from-blue-50 to-blue-100',
                  iconColor: 'text-blue-600',
                },
                {
                  href: '/explorer',
                  icon: Search,
                  title: 'Explore Runes',
                  description: 'Browse and discover Bitcoin Runes on-chain',
                  gradient: 'from-purple-50 to-purple-100',
                  iconColor: 'text-purple-600',
                },
              ].map((action) => (
                <motion.div key={action.href} variants={staggerItem}>
                  <Link href={action.href}>
                    <motion.div
                      className={`group p-8 bg-gradient-to-br ${action.gradient} border border-museum-light-gray rounded-xl hover:shadow-xl transition-all h-full`}
                      whileHover={{ y: -6, scale: 1.02 }}
                    >
                      <action.icon className={`h-10 w-10 ${action.iconColor} mb-4`} />
                      <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                        {action.title}
                      </h3>
                      <p className="text-museum-dark-gray mb-6">
                        {action.description}
                      </p>
                      <div className="flex items-center gap-2 text-museum-black font-medium">
                        Start now
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gradient-to-r from-gold-500 to-gold-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Create Your First Rune?
            </h2>
            <p className="text-xl text-gold-50 mb-8">
              Join the future of Bitcoin programmability today
            </p>
            <Link href="/dashboard">
              <ButtonPremium
                variant="secondary"
                size="lg"
                icon={<Sparkles className="h-5 w-5" />}
              >
                Launch Dashboard
              </ButtonPremium>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
